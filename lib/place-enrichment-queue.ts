import mongoose from "mongoose"
import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import { getBaseUrl } from "@/lib/base-url"
import { logApiError } from "@/lib/logger"
import { isPlaceMissingTaccClassification } from "@/lib/place-incomplete"
import {
  catalogStatusFilter,
  shouldEnqueuePlaceForResearch,
  type EnrichmentCatalog,
} from "@/lib/place-enrichment-eligibility"
import { runPlaceResearch } from "@/lib/place-research/run-place-research"
import { waitUntil } from "@vercel/functions"

export type { EnrichmentCatalog }
export { catalogStatusFilter, shouldEnqueuePlaceForResearch }

const MAX_PLACES_PER_TICK = 1
/** Vercel mata la función a los 60s; reclaim antes. */
const QUEUE_JOB_STALE_MS = 65_000
const ENQUEUE_LIMIT = 500

export type EnrichmentQueueOptions = {
  catalog?: EnrichmentCatalog
  ids?: string[]
}

const PLACE_SELECT =
  "name address neighborhood type types contact openingHours photos safetyLevel tags description location aiEnrichment"

export type EnrichmentQueueStats = {
  queued: number
  running: number
  done: number
  failed: number
  incomplete: number
  workerActive: boolean
  stalled: boolean
  stuckRunning: number
}

function getInternalJobSecret(): string | null {
  return process.env.INTERNAL_JOB_SECRET?.trim() || null
}

export async function getEnrichmentQueueStats(
  catalog: EnrichmentCatalog = "pending"
): Promise<EnrichmentQueueStats> {
  await connectDB()
  const staleBefore = new Date(Date.now() - QUEUE_JOB_STALE_MS)
  const scope = catalogStatusFilter(catalog)
  const [queued, running, done, failed, stuckRunning, places] = await Promise.all([
    Place.countDocuments({ ...scope, "aiEnrichment.status": "queued" }),
    Place.countDocuments({ ...scope, "aiEnrichment.status": "running" }),
    Place.countDocuments({ ...scope, "aiEnrichment.status": "done" }),
    Place.countDocuments({ ...scope, "aiEnrichment.status": "failed" }),
    Place.countDocuments({
      ...scope,
      "aiEnrichment.status": "running",
      "aiEnrichment.startedAt": { $lt: staleBefore },
    }),
    Place.find(scope)
      .select(PLACE_SELECT)
      .limit(3000)
      .lean(),
  ])

  const incomplete = places.filter((place) => isPlaceMissingTaccClassification(place)).length
  const stalled =
    (queued > 0 && running === 0) || stuckRunning > 0 || (queued > 0 && stuckRunning > 0)

  return {
    queued,
    running,
    done,
    failed,
    incomplete,
    workerActive: running > 0 && stuckRunning < running,
    stalled,
    stuckRunning,
  }
}

export async function resetStaleEnrichmentJobs(): Promise<number> {
  await connectDB()
  const staleBefore = new Date(Date.now() - QUEUE_JOB_STALE_MS)
  const result = await Place.updateMany(
    {
      status: "pending",
      "aiEnrichment.status": "running",
      $or: [
        { "aiEnrichment.startedAt": { $lt: staleBefore } },
        { "aiEnrichment.startedAt": { $exists: false } },
      ],
    },
    {
      $set: {
        "aiEnrichment.status": "queued",
        "aiEnrichment.error": undefined,
      },
    }
  )
  return result.modifiedCount
}

export async function enqueueIncompletePlaces(
  options: EnrichmentQueueOptions = {}
): Promise<{ queued: number; skipped: number }> {
  await connectDB()
  const ids = (options.ids ?? []).filter((id) => mongoose.Types.ObjectId.isValid(id))
  const query: Record<string, unknown> = { status: "pending" }
  if (ids.length) {
    query._id = { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) }
  }

  const places = await Place.find(query)
    .select(`${PLACE_SELECT} status`)
    .sort({ updatedAt: 1 })
    .limit(ids.length ? ids.length : 3000)
    .lean()

  let queued = 0
  let skipped = 0

  for (const place of places) {
    if (
      !shouldEnqueuePlaceForResearch(place, {
        force: ids.length > 0,
      })
    ) {
      skipped++
      continue
    }

    await Place.updateOne(
      { _id: place._id },
      {
        $set: {
          aiEnrichment: {
            status: "queued",
            startedAt: new Date(),
            summary: "",
            evidence: [],
            needsAdmin: true,
          },
        },
      }
    )
    queued++
    if (queued >= ENQUEUE_LIMIT) break
  }

  return { queued, skipped }
}

async function claimNextQueuedPlace(): Promise<string | null> {
  await connectDB()
  const claimed = await Place.findOneAndUpdate(
    {
      status: "pending",
      "aiEnrichment.status": "queued",
    },
    {
      $set: {
        "aiEnrichment.status": "running",
        "aiEnrichment.startedAt": new Date(),
        "aiEnrichment.summary": "",
        "aiEnrichment.evidence": [],
        "aiEnrichment.needsAdmin": true,
        "aiEnrichment.error": undefined,
      },
    },
    {
      sort: { "aiEnrichment.startedAt": 1, updatedAt: 1 },
      new: true,
      projection: { _id: 1 },
    }
  )

  return claimed?._id?.toString() ?? null
}

export async function processEnrichmentQueueTick(): Promise<{
  processed: number
  remaining: number
}> {
  let processed = 0

  while (processed < MAX_PLACES_PER_TICK) {
    const placeId = await claimNextQueuedPlace()
    if (!placeId) break

    try {
      const result = await runPlaceResearch(placeId, {
        lightweight: true,
        skipRunningMark: true,
      })
      if (result.status === "failed") {
        logApiError(
          "processEnrichmentQueueTick",
          new Error(`${placeId}: ${result.error ?? "IA falló"}`)
        )
      }
    } catch (err) {
      logApiError("processEnrichmentQueueTick", err)
      await Place.updateOne(
        { _id: placeId, "aiEnrichment.status": "running" },
        {
          $set: {
            aiEnrichment: {
              status: "failed",
              ranAt: new Date(),
              summary: "",
              evidence: [],
              needsAdmin: true,
              error:
                err instanceof Error
                  ? err.message
                  : "Error al procesar lugar en cola",
            },
          },
        }
      )
    }

    processed++
  }

  const remaining = await Place.countDocuments({
    status: "pending",
    "aiEnrichment.status": "queued",
  })

  return { processed, remaining }
}

function scheduleNextQueueWorker(): void {
  const secret = getInternalJobSecret()
  if (!secret) {
    logApiError(
      "scheduleNextQueueWorker",
      new Error("INTERNAL_JOB_SECRET no configurado — la cola no puede encadenarse en Vercel"),
      {}
    )
    return
  }

  const baseUrl = getBaseUrl()
  const task = fetch(`${baseUrl}/api/internal/place-enrichment-queue/run`, {
    method: "POST",
    headers: {
      "x-internal-job-secret": secret,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  }).catch((err) => {
    logApiError("scheduleNextQueueWorker", err, {})
  })

  try {
    waitUntil(task)
  } catch {
    void task
  }
}

export async function runEnrichmentQueueWorker(): Promise<void> {
  try {
    await resetStaleEnrichmentJobs()
    const { remaining } = await processEnrichmentQueueTick()
    if (remaining > 0) {
      scheduleNextQueueWorker()
    }
  } catch (err) {
    logApiError("runEnrichmentQueueWorker", err, {})
    const remaining = await Place.countDocuments({
      status: "pending",
      "aiEnrichment.status": "queued",
    }).catch(() => 0)
    if (remaining > 0) scheduleNextQueueWorker()
  }
}

export async function startEnrichmentQueue(
  options: EnrichmentQueueOptions = {}
): Promise<{
  queued: number
  skipped: number
  stats: EnrichmentQueueStats
}> {
  await resetStaleEnrichmentJobs()
  const { queued, skipped } = await enqueueIncompletePlaces({ ...options, catalog: "pending" })
  const stats = await getEnrichmentQueueStats("pending")
  if (stats.queued > 0 || stats.stuckRunning > 0) {
    scheduleNextQueueWorker()
  }
  const latestStats = await getEnrichmentQueueStats("pending")
  return { queued, skipped, stats: latestStats }
}

export async function resumeEnrichmentQueue(): Promise<EnrichmentQueueStats> {
  await resetStaleEnrichmentJobs()
  const stats = await getEnrichmentQueueStats("pending")
  if (stats.queued > 0 || stats.stuckRunning > 0) {
    scheduleNextQueueWorker()
  }
  return getEnrichmentQueueStats("pending")
}

/** Saca queued/running. El lugar ya en vuelo puede terminar igual. */
export async function cancelEnrichmentQueue(): Promise<{
  cancelled: number
  stats: EnrichmentQueueStats
}> {
  await connectDB()
  const result = await Place.updateMany(
    {
      status: "pending",
      "aiEnrichment.status": { $in: ["queued", "running"] },
    },
    {
      $set: {
        aiEnrichment: {
          status: "pending",
          ranAt: new Date(),
          summary: "",
          evidence: [],
          needsAdmin: true,
          error: "Cola cancelada",
        },
      },
    }
  )
  const stats = await getEnrichmentQueueStats("pending")
  return { cancelled: result.modifiedCount, stats }
}

export function isValidInternalJobRequest(secret: string | null): boolean {
  const expected = getInternalJobSecret()
  if (!expected) return false
  return Boolean(secret && secret === expected)
}
