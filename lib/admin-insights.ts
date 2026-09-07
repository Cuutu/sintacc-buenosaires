import connectDB from "@/lib/mongodb"
import { ProductEvent } from "@/models/ProductEvent"
import { User } from "@/models/User"
import { Review } from "@/models/Review"
import { Favorite } from "@/models/Favorite"
import { Suggestion } from "@/models/Suggestion"
import { Place } from "@/models/Place"
import { TYPES } from "@/lib/constants"
import { logger } from "@/lib/logger"
import { ACTIVITY_ACTIVE_MS } from "@/lib/format-relative-activity"
import type {
  AdminInsightsPayload,
  InsightsActivityRow,
  InsightsCountRow,
  InsightsMetric,
  InsightsPlaceRow,
  InsightsRangeKey,
} from "@/lib/admin-insights-types"

export type {
  AdminInsightsPayload,
  InsightsCountRow,
  InsightsMetric,
  InsightsPlaceRow,
  InsightsRangeKey,
  InsightsSearchRow,
} from "@/lib/admin-insights-types"

const RANGE_DAYS: Record<InsightsRangeKey, number> = {
  "1d": 1,
  "7d": 7,
  "30d": 30,
}

const TYPE_LABEL = Object.fromEntries(TYPES.map((t) => [t.value, t.label]))
const DAY_MS = 24 * 60 * 60 * 1000
const QUERY_CHUNK = 3

async function runInChunks<T>(
  fns: Array<() => T | Promise<T>>,
  chunkSize = QUERY_CHUNK
): Promise<T[]> {
  const out: T[] = []
  for (let i = 0; i < fns.length; i += chunkSize) {
    const part = await Promise.all(fns.slice(i, i + chunkSize).map((fn) => Promise.resolve(fn())))
    out.push(...part)
  }
  return out
}

function metric(value: number, previous: number, source: InsightsMetric["source"]): InsightsMetric {
  if (previous === 0) {
    return { value, previous, deltaPct: null, source }
  }
  return {
    value,
    previous,
    deltaPct: Math.round(((value - previous) / previous) * 100),
    source,
  }
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function rangeWindow(key: InsightsRangeKey, now = new Date()) {
  const days = RANGE_DAYS[key]
  const to = now
  const from = new Date(to.getTime() - days * DAY_MS)
  const prevTo = from
  const prevFrom = new Date(from.getTime() - days * DAY_MS)
  const todayFrom = startOfUtcDay(to)
  return { from, to, prevFrom, prevTo, todayFrom }
}

async function countDistinct(match: Record<string, unknown>): Promise<number> {
  const rows = await ProductEvent.aggregate<{ n: number }>([
    { $match: match },
    { $group: { _id: "$distinctId" } },
    { $count: "n" },
  ])
  return rows[0]?.n ?? 0
}

async function countEvents(match: Record<string, unknown>): Promise<number> {
  return ProductEvent.countDocuments(match)
}

async function uniqueGroupField(
  match: Record<string, unknown>,
  field: string,
  limit = 8
): Promise<InsightsCountRow[]> {
  const rows = await ProductEvent.aggregate<{ _id: string; count: number }>([
    { $match: match },
    { $group: { _id: { distinctId: "$distinctId", value: `$${field}` } } },
    { $group: { _id: "$_id.value", count: { $sum: 1 } } },
    { $match: { _id: { $nin: [null, ""] } } },
    { $sort: { count: -1 } },
    { $limit: limit },
  ])
  return rows.map((row) => ({
    key: String(row._id),
    label: String(row._id),
    count: row.count,
  }))
}

/**
 * % de dispositivos con first_open en [cohortFrom, cohortTo)
 * que tuvieron otro evento en el día D+windowDays.
 */
async function retentionRate(
  cohortFrom: Date,
  cohortTo: Date,
  windowDays: number
): Promise<number | null> {
  const cohort = await ProductEvent.aggregate<{ _id: string; first: Date }>([
    { $match: { name: "first_open", ts: { $gte: cohortFrom, $lt: cohortTo } } },
    { $group: { _id: "$distinctId", first: { $min: "$ts" } } },
  ])
  if (cohort.length < 5) return null

  const ids = cohort.map((row) => row._id)
  const windowEnd = new Date(cohortTo.getTime() + (windowDays + 1) * DAY_MS)
  const later = await ProductEvent.aggregate<{ _id: string; times: Date[] }>([
    { $match: { distinctId: { $in: ids }, ts: { $gte: cohortFrom, $lt: windowEnd } } },
    { $group: { _id: "$distinctId", times: { $push: "$ts" } } },
  ])
  const timesById = new Map(later.map((row) => [row._id, row.times.map((t) => new Date(t).getTime())]))

  let kept = 0
  for (const row of cohort) {
    const first = row.first.getTime()
    const start = first + windowDays * DAY_MS
    const end = start + DAY_MS
    const times = timesById.get(row._id) ?? []
    if (times.some((t) => t >= start && t < end)) kept += 1
  }
  return Math.round((kept / cohort.length) * 100)
}

function emptyInsights(range: InsightsRangeKey, from: Date, to: Date): AdminInsightsPayload {
  const eventsZero = metric(0, 0, "events")
  const dbZero = metric(0, 0, "database")
  return {
    range,
    from: from.toISOString(),
    to: to.toISOString(),
    hasEventData: false,
    eventCount: 0,
    overview: {
      activeToday: eventsZero,
      activeRange: eventsZero,
      newAccounts: dbZero,
      newDevices: eventsZero,
      returning: eventsZero,
      placeViews: eventsZero,
      searches: eventsZero,
      reviews: dbZero,
      favorites: dbZero,
      suggestions: dbZero,
      directions: eventsZero,
    },
    acquisition: {
      available: false,
      note: "País/ciudad vienen de Vercel (IP), no de GPS. En local casi siempre vacío. Campaña solo si hay utm_campaign.",
      sources: [],
      mediums: [],
      campaigns: [],
      entryPaths: [],
      countries: [],
      regions: [],
      cities: [],
      devices: [],
      platforms: [],
    },
    behavior: {
      available: false,
      topPlaces: [],
      topCategories: [],
      topCities: [],
      topFilters: [],
      topSearches: [],
      zeroSearches: [],
      directions: 0,
      favorites: 0,
      reviews: 0,
    },
    retention: {
      available: false,
      note: "Retención por dispositivo anónimo, no por cuenta Google/Apple. Pedimos ≥5 dispositivos en la cohorte.",
      newDevices: 0,
      returning: 0,
      d1: null,
      d7: null,
      d30: null,
    },
    errors: {
      available: false,
      login: 0,
      mapLoad: 0,
      placeLoad: 0,
      recent: [],
    },
    activity: {
      available: false,
      android: 0,
      ios: 0,
      web: 0,
      activeNow: 0,
      rows: [],
    },
  }
}

export async function getAdminInsights(range: InsightsRangeKey): Promise<AdminInsightsPayload> {
  const { from, to, prevFrom, prevTo, todayFrom } = rangeWindow(range)
  try {
    await connectDB()
  } catch (error) {
    logger.error({
      route: "getAdminInsights",
      error: error instanceof Error ? error.message : String(error),
      message: "mongo connect failed",
    })
    return emptyInsights(range, from, to)
  }
  const period = { ts: { $gte: from, $lt: to } }
  const prev = { ts: { $gte: prevFrom, $lt: prevTo } }
  const today = { ts: { $gte: todayFrom, $lt: to } }

  let eventCount = 0
  try {
    eventCount = await countEvents(period)
  } catch (error) {
    logger.error({
      route: "getAdminInsights",
      error: error instanceof Error ? error.message : String(error),
      message: "productevents count failed",
    })
  }
  const hasEventData = eventCount > 0

  let dbNewUsers = 0
  let dbNewUsersPrev = 0
  let dbReviews = 0
  let dbReviewsPrev = 0
  let dbFavorites = 0
  let dbFavoritesPrev = 0
  let dbSuggestions = 0
  let dbSuggestionsPrev = 0
  try {
    ;[
      dbNewUsers,
      dbNewUsersPrev,
      dbReviews,
      dbReviewsPrev,
      dbFavorites,
      dbFavoritesPrev,
      dbSuggestions,
      dbSuggestionsPrev,
    ] = await runInChunks(
      [
        () => User.countDocuments({ createdAt: { $gte: from, $lt: to } }),
        () => User.countDocuments({ createdAt: { $gte: prevFrom, $lt: prevTo } }),
        () => Review.countDocuments({ createdAt: { $gte: from, $lt: to } }),
        () => Review.countDocuments({ createdAt: { $gte: prevFrom, $lt: prevTo } }),
        () => Favorite.countDocuments({ createdAt: { $gte: from, $lt: to } }),
        () => Favorite.countDocuments({ createdAt: { $gte: prevFrom, $lt: prevTo } }),
        () => Suggestion.countDocuments({ createdAt: { $gte: from, $lt: to } }),
        () => Suggestion.countDocuments({ createdAt: { $gte: prevFrom, $lt: prevTo } }),
      ],
      4
    )
  } catch (error) {
    logger.error({
      route: "getAdminInsights",
      error: error instanceof Error ? error.message : String(error),
      message: "database metrics failed",
    })
  }

  let activeToday = 0
  let activeRange = 0
  let activePrev = 0
  let newDevices = 0
  let newDevicesPrev = 0
  let placeViews = 0
  let placeViewsPrev = 0
  let searches = 0
  let searchesPrev = 0
  let directions = 0
  let directionsPrev = 0
  let loginErrors = 0
  let mapErrors = 0
  let placeErrors = 0

  if (hasEventData) {
    try {
      ;[
        activeToday,
        activeRange,
        activePrev,
        newDevices,
        newDevicesPrev,
        placeViews,
        placeViewsPrev,
        searches,
        searchesPrev,
        directions,
        directionsPrev,
        loginErrors,
        mapErrors,
        placeErrors,
      ] = await runInChunks([
        () => countDistinct(today),
        () => countDistinct(period),
        () => countDistinct(prev),
        () => countEvents({ ...period, name: "first_open" }),
        () => countEvents({ ...prev, name: "first_open" }),
        () => countEvents({ ...period, name: "place_view" }),
        () => countEvents({ ...prev, name: "place_view" }),
        () => countEvents({ ...period, name: "search_performed" }),
        () => countEvents({ ...prev, name: "search_performed" }),
        () => countEvents({ ...period, name: "directions_clicked" }),
        () => countEvents({ ...prev, name: "directions_clicked" }),
        () => countEvents({ ...period, name: "login_error" }),
        () => countEvents({ ...period, name: "map_load_error" }),
        () => countEvents({ ...period, name: "place_load_error" }),
      ])
    } catch (error) {
      logger.error({
        route: "getAdminInsights",
        error: error instanceof Error ? error.message : String(error),
        message: "event metrics failed",
      })
    }
  }

  const returning = Math.max(0, activeRange - newDevices)
  const returningPrev = Math.max(0, activePrev - newDevicesPrev)

  let androidUsers = 0
  let iosUsers = 0
  let webUsers = 0
  let activeNow = 0
  let activityRowsRaw: Array<{
    _id: string
    lastTs: Date
    platform: string
    device: string
    appVersion: string
  }> = []

  if (hasEventData) {
    try {
      ;[androidUsers, iosUsers, webUsers, activeNow] = await runInChunks([
        () => countDistinct({ ...period, platform: "android_native" }),
        () => countDistinct({ ...period, platform: "ios_native" }),
        () => countDistinct({ ...period, platform: { $in: ["web", "pwa"] } }),
        () =>
          countDistinct({
            ts: { $gte: new Date(to.getTime() - ACTIVITY_ACTIVE_MS), $lt: to },
          }),
      ])
      activityRowsRaw = await ProductEvent.aggregate([
        { $match: period },
        { $sort: { distinctId: 1, ts: -1 } },
        {
          $group: {
            _id: "$distinctId",
            lastTs: { $first: "$ts" },
            platform: { $first: "$platform" },
            device: { $first: "$device" },
            appVersion: { $first: "$appVersion" },
          },
        },
        { $sort: { lastTs: -1 } },
        { $limit: 80 },
      ])
    } catch (error) {
      logger.error({
        route: "getAdminInsights",
        error: error instanceof Error ? error.message : String(error),
        message: "activity query failed",
      })
    }
  }

  const activityRows: InsightsActivityRow[] = activityRowsRaw.map((row) => ({
    id: String(row._id).slice(0, 8),
    lastTs: new Date(row.lastTs).toISOString(),
    platform: String(row.platform || "web"),
    device: String(row.device || ""),
    appVersion: String(row.appVersion || ""),
  }))

  const [sources, mediums, campaigns, entryPaths, countries, regions, cities, devices, platforms] =
    hasEventData
      ? await runInChunks([
          () => uniqueGroupField(period, "source"),
          () => uniqueGroupField(period, "medium"),
          () => uniqueGroupField(period, "campaign"),
          () => uniqueGroupField(period, "entryPath"),
          () => uniqueGroupField(period, "country"),
          () => uniqueGroupField(period, "region"),
          () => uniqueGroupField(period, "city"),
          () => uniqueGroupField(period, "device"),
          () => uniqueGroupField(period, "platform"),
        ]).catch((error) => {
          logger.error({
            route: "getAdminInsights",
            error: error instanceof Error ? error.message : String(error),
            message: "acquisition query failed",
          })
          return [[], [], [], [], [], [], [], [], []] as InsightsCountRow[][]
        })
      : [[], [], [], [], [], [], [], [], []]

  let topPlaceRows: Array<{ _id: string; views: number; city: string; category: string }> = []
  let topCategories: Array<{ _id: string; count: number }> = []
  let topCities: Array<{ _id: string; count: number }> = []
  let topFilters: Array<{ _id: string; count: number }> = []
  let topSearches: Array<{ _id: string; count: number; avg: number }> = []
  let zeroSearches: Array<{ _id: string; count: number }> = []
  let recentErrors: Array<{ name?: string; ts?: Date; props?: { reason?: string }; platform?: string }> =
    []

  if (hasEventData) {
    try {
      ;[
        topPlaceRows,
        topCategories,
        topCities,
        topFilters,
        topSearches,
        zeroSearches,
        recentErrors,
      ] = (await runInChunks<unknown>([
        () =>
          ProductEvent.aggregate<{ _id: string; views: number; city: string; category: string }>([
            { $match: { ...period, name: "place_view", "props.placeId": { $type: "string", $ne: "" } } },
            {
              $group: {
                _id: "$props.placeId",
                views: { $sum: 1 },
                city: { $last: "$props.city" },
                category: { $last: "$props.category" },
              },
            },
            { $sort: { views: -1 } },
            { $limit: 8 },
          ]),
        () =>
          ProductEvent.aggregate<{ _id: string; count: number }>([
            { $match: { ...period, name: "place_view", "props.category": { $type: "string", $ne: "" } } },
            { $group: { _id: "$props.category", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 8 },
          ]),
        () =>
          ProductEvent.aggregate<{ _id: string; count: number }>([
            {
              $match: {
                ...period,
                name: { $in: ["place_view", "search_performed", "city_page_view"] },
                "props.city": { $type: "string", $ne: "" },
              },
            },
            { $group: { _id: "$props.city", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 8 },
          ]),
        () =>
          ProductEvent.aggregate<{ _id: string; count: number }>([
            { $match: { ...period, name: "map_filter" } },
            {
              $group: {
                _id: {
                  $concat: [
                    { $ifNull: ["$props.type", ""] },
                    "|",
                    { $ifNull: ["$props.neighborhood", ""] },
                    "|",
                    { $ifNull: ["$props.safetyLevel", ""] },
                  ],
                },
                count: { $sum: 1 },
              },
            },
            { $sort: { count: -1 } },
            { $limit: 8 },
          ]),
        () =>
          ProductEvent.aggregate<{ _id: string; count: number; avg: number }>([
            { $match: { ...period, name: "search_performed", "props.query": { $type: "string", $ne: "" } } },
            {
              $group: {
                _id: "$props.query",
                count: { $sum: 1 },
                avg: { $avg: "$props.resultCount" },
              },
            },
            { $sort: { count: -1 } },
            { $limit: 10 },
          ]),
        () =>
          ProductEvent.aggregate<{ _id: string; count: number }>([
            { $match: { ...period, name: "search_no_results", "props.query": { $type: "string", $ne: "" } } },
            { $group: { _id: "$props.query", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
          ]),
        () =>
          ProductEvent.find({
            ...period,
            name: { $in: ["login_error", "map_load_error", "place_load_error"] },
          })
            .sort({ ts: -1 })
            .limit(8)
            .select("name ts props platform")
            .lean(),
      ])) as [
        typeof topPlaceRows,
        typeof topCategories,
        typeof topCities,
        typeof topFilters,
        typeof topSearches,
        typeof zeroSearches,
        typeof recentErrors,
      ]
    } catch (error) {
      logger.error({
        route: "getAdminInsights",
        error: error instanceof Error ? error.message : String(error),
        message: "behavior query failed",
      })
    }
  }

  const placeIds = topPlaceRows
    .map((row) => row._id)
    .filter((id) => typeof id === "string" && /^[a-f\d]{24}$/i.test(id))
  const places =
    placeIds.length > 0
      ? await Place.find({ _id: { $in: placeIds } })
          .select("name type locality neighborhood")
          .lean()
          .catch((error) => {
            logger.error({
              route: "getAdminInsights",
              error: error instanceof Error ? error.message : String(error),
              message: "place lookup failed",
            })
            return []
          })
      : []
  const placeById = new Map(places.map((p) => [String(p._id), p]))

  const topPlaces: InsightsPlaceRow[] = topPlaceRows.map((row) => {
    const place = placeById.get(String(row._id))
    return {
      placeId: String(row._id),
      name: place?.name || "Lugar sin ficha",
      category: String(place?.type || row.category || ""),
      city: String(place?.locality || place?.neighborhood || row.city || ""),
      views: row.views,
    }
  })

  const [d1, d7, d30] = hasEventData
    ? await runInChunks(
        [
          () => retentionRate(new Date(to.getTime() - 8 * DAY_MS), new Date(to.getTime() - DAY_MS), 1),
          () =>
            retentionRate(new Date(to.getTime() - 21 * DAY_MS), new Date(to.getTime() - 8 * DAY_MS), 7),
          () =>
            retentionRate(
              new Date(to.getTime() - 51 * DAY_MS),
              new Date(to.getTime() - 31 * DAY_MS),
              30
            ),
        ],
        1
      ).catch((error) => {
        logger.error({
          route: "getAdminInsights",
          error: error instanceof Error ? error.message : String(error),
          message: "retention query failed",
        })
        return [null, null, null] as Array<number | null>
      })
    : [null, null, null]

  return {
    range,
    from: from.toISOString(),
    to: to.toISOString(),
    hasEventData,
    eventCount,
    overview: {
      activeToday: metric(activeToday, 0, "events"),
      activeRange: metric(activeRange, activePrev, "events"),
      newAccounts: metric(dbNewUsers, dbNewUsersPrev, "database"),
      newDevices: metric(newDevices, newDevicesPrev, "events"),
      returning: metric(returning, returningPrev, "events"),
      placeViews: metric(placeViews, placeViewsPrev, "events"),
      searches: metric(searches, searchesPrev, "events"),
      reviews: metric(dbReviews, dbReviewsPrev, "database"),
      favorites: metric(dbFavorites, dbFavoritesPrev, "database"),
      suggestions: metric(dbSuggestions, dbSuggestionsPrev, "database"),
      directions: metric(directions, directionsPrev, "events"),
    },
    acquisition: {
      available: hasEventData,
      note: "País/ciudad vienen de Vercel (IP), no de GPS. En local casi siempre vacío. Campaña solo si hay utm_campaign.",
      sources,
      mediums,
      campaigns: campaigns.filter((row) => row.key),
      entryPaths,
      countries,
      regions,
      cities,
      devices,
      platforms,
    },
    behavior: {
      available: hasEventData,
      topPlaces,
      topCategories: topCategories.map((row) => ({
        key: String(row._id),
        label: TYPE_LABEL[String(row._id)] || String(row._id),
        count: row.count,
      })),
      topCities: topCities.map((row) => ({
        key: String(row._id),
        label: String(row._id),
        count: row.count,
      })),
      topFilters: topFilters
        .map((row) => {
          const [type, neighborhood, safety] = String(row._id).split("|")
          const parts = [type ? TYPE_LABEL[type] || type : "", neighborhood, safety].filter(Boolean)
          return {
            key: String(row._id),
            label: parts.join(" · ") || "",
            count: row.count,
          }
        })
        .filter((row) => row.label),
      topSearches: topSearches.map((row) => ({
        query: String(row._id),
        count: row.count,
        resultCountAvg:
          typeof row.avg === "number" && Number.isFinite(row.avg) ? Math.round(row.avg) : null,
      })),
      zeroSearches: zeroSearches.map((row) => ({
        query: String(row._id),
        count: row.count,
        resultCountAvg: 0,
      })),
      directions,
      favorites: dbFavorites,
      reviews: dbReviews,
    },
    retention: {
      available: hasEventData,
      note: "Retención por dispositivo anónimo, no por cuenta Google/Apple. Pedimos ≥5 dispositivos en la cohorte.",
      newDevices,
      returning,
      d1,
      d7,
      d30,
    },
    errors: {
      available: loginErrors + mapErrors + placeErrors > 0,
      login: loginErrors,
      mapLoad: mapErrors,
      placeLoad: placeErrors,
      recent: recentErrors.map((row) => ({
        name: String(row.name),
        ts: new Date(row.ts ?? 0).toISOString(),
        reason: String((row as { props?: { reason?: string } }).props?.reason || ""),
        platform: String(row.platform || ""),
      })),
    },
    activity: {
      available: hasEventData,
      android: androidUsers,
      ios: iosUsers,
      web: webUsers,
      activeNow,
      rows: activityRows,
    },
  }
}

export async function getAdminInsightsCached(
  range: InsightsRangeKey
): Promise<AdminInsightsPayload> {
  return getAdminInsights(range)
}

export { parseInsightsRange } from "@/lib/admin-insights-types"
