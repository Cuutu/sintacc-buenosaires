export type InsightsRangeKey = "1d" | "7d" | "30d"

export function parseInsightsRange(value: string | null): InsightsRangeKey {
  if (value === "1d" || value === "30d" || value === "7d") return value
  return "7d"
}

export type InsightsMetric = {
  value: number
  previous: number
  deltaPct: number | null
  source: "events" | "database"
}

export type InsightsCountRow = {
  key: string
  label: string
  count: number
}

export type InsightsSearchRow = {
  query: string
  count: number
  resultCountAvg: number | null
}

export type InsightsPlaceRow = {
  placeId: string
  name: string
  category: string
  city: string
  views: number
}

export type InsightsActivityRow = {
  id: string
  lastTs: string
  platform: string
  device: string
  appVersion: string
}

export type AdminInsightsPayload = {
  range: InsightsRangeKey
  from: string
  to: string
  hasEventData: boolean
  eventCount: number
  overview: {
    activeToday: InsightsMetric
    activeRange: InsightsMetric
    newAccounts: InsightsMetric
    newDevices: InsightsMetric
    returning: InsightsMetric
    placeViews: InsightsMetric
    searches: InsightsMetric
    reviews: InsightsMetric
    favorites: InsightsMetric
    suggestions: InsightsMetric
    directions: InsightsMetric
  }
  acquisition: {
    available: boolean
    note: string
    sources: InsightsCountRow[]
    mediums: InsightsCountRow[]
    campaigns: InsightsCountRow[]
    entryPaths: InsightsCountRow[]
    countries: InsightsCountRow[]
    regions: InsightsCountRow[]
    cities: InsightsCountRow[]
    devices: InsightsCountRow[]
    platforms: InsightsCountRow[]
  }
  behavior: {
    available: boolean
    topPlaces: InsightsPlaceRow[]
    topCategories: InsightsCountRow[]
    topCities: InsightsCountRow[]
    topFilters: InsightsCountRow[]
    topSearches: InsightsSearchRow[]
    zeroSearches: InsightsSearchRow[]
    directions: number
    favorites: number
    reviews: number
  }
  retention: {
    available: boolean
    note: string
    newDevices: number
    returning: number
    d1: number | null
    d7: number | null
    d30: number | null
  }
  errors: {
    available: boolean
    login: number
    mapLoad: number
    placeLoad: number
    recent: Array<{ name: string; ts: string; reason: string; platform: string }>
  }
  activity: {
    available: boolean
    android: number
    ios: number
    web: number
    activeNow: number
    rows: InsightsActivityRow[]
  }
}
