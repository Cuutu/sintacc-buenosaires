import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import { getBaseUrl } from "@/lib/base-url"
import { logApiError } from "@/lib/logger"
import { isPlaceInformationIncomplete } from "@/lib/place-incomplete"
import { runPlaceResearch } from "@/lib/place-research/run-place-research"

const MAX_PLACES_PER_TICK = 1
/** Vercel mata la función a los 60s; reclaim antes. */
const QUEUE_JOB_STALE_MS = 65_000
const ENQUEUE_LIMIT = 500

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

export async function getEnrichmentQueueStats(): Promise<EnrichmentQueueStats> {
  await connectDB()
  const staleBefore = new Date(Date.now() - QUEUE_JOB_STALE_MS)
  const [queued, running, done, failed, stuckRunning, places] = await Promise.all([
    Place.countDocuments({ status: "approved", "aiEnrichment.status": "queued" }),
    Place.countDocuments({ status: "approved", "aiEnrichment.status": "running" }),
    Place.countDocuments({ status: "approved", "aiEnrichment.status": "done" }),
    Place.countDocuments({ status: "approved", "aiEnrichment.status": "failed" }),
    Place.countDocuments({
      status: "approved",
      "aiEnrichment.status": "running",
      "aiEnrichment.startedAt": { $lt: staleBefore },
    }),
    Place.find({ status: "approved" })
      .select("name address neighborhood type types contact openingHours photos safetyLevel")
      .limit(3000)
      .lean(),
  ])

  const incomplete = places.filter((place) => isPlaceInformationIncomplete(place)).length
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
      status: "approved",
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

export async function enqueueIncompletePlaces(): Promise<{ queued: number; skipped: number }> {
  await connectDB()
  const places = await Place.find({ status: "approved" })
    .select("name address neighborhood type types contact openingHours photos safetyLevel aiEnrichment")
    .sort({ updatedAt: 1 })
    .limit(3000)
    .lean()

  let queued = 0
  let skipped = 0

  for (const place of places) {
    if (!isPlaceInformationIncomplete(place)) {
      skipped++
      continue
    }

    const status = place.aiEnrichment?.status
    if (status === "queued" || status === "running") {
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
      status: "approved",
      "aiEnrichment.status": "queued",
    },
    {
      $set: {
        "aiEnrichment.status": "running",
        "aiEnrichment.startedAt": new Date(),
        "aiEnrichment.error": undefined,
      },
    },
    {
      sort: { "aiEnrichment.startedAt": 1, updatedAt: 1 },
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
    status: "approved",
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
  void fetch(`${baseUrl}/api/internal/place-enrichment-queue/run`, {
    method: "POST",
    headers: {
      "x-internal-job-secret": secret,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  }).catch((err) => {
    logApiError("scheduleNextQueueWorker", err, {})
  })
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
      status: "approved",
      "aiEnrichment.status": "queued",
    }).catch(() => 0)
    if (remaining > 0) scheduleNextQueueWorker()
  }
}

export async function startEnrichmentQueue(): Promise<{
  queued: number
  skipped: number
  stats: EnrichmentQueueStats
}> {
  await resetStaleEnrichmentJobs()
  const { queued, skipped } = await enqueueIncompletePlaces()
  const stats = await getEnrichmentQueueStats()
  if (stats.queued > 0 || stats.stuckRunning > 0) {
    scheduleNextQueueWorker()
  }
  const latestStats = await getEnrichmentQueueStats()
  return { queued, skipped, stats: latestStats }
}

export async function resumeEnrichmentQueue(): Promise<EnrichmentQueueStats> {
  await resetStaleEnrichmentJobs()
  const stats = await getEnrichmentQueueStats()
  if (stats.queued > 0 || stats.stuckRunning > 0) {
    scheduleNextQueueWorker()
  }
  return getEnrichmentQueueStats()
}

export function isValidInternalJobRequest(secret: string | null): boolean {
  const expected = getInternalJobSecret()
  if (!expected) return false
  return Boolean(secret && secret === expected)
}
