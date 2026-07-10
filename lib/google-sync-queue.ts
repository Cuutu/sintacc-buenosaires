import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import { getBaseUrl } from "@/lib/base-url"
import { logApiError } from "@/lib/logger"
import {
  placeNeedsGoogleSync,
  syncPlaceGoogleReviews,
} from "@/lib/google-place-sync"
import { isValidInternalJobRequest } from "@/lib/place-enrichment-queue"
import { waitUntil } from "@vercel/functions"

const MAX_PLACES_PER_TICK = 1
const QUEUE_JOB_STALE_MS = 65_000
const ENQUEUE_LIMIT = 500

export type GoogleSyncQueueStats = {
  queued: number
  running: number
  done: number
  failed: number
  needsSync: number
  withSnapshot: number
  coveragePct: number
  approvedTotal: number
  workerActive: boolean
  stalled: boolean
  stuckRunning: number
}

function getInternalJobSecret(): string | null {
  return process.env.INTERNAL_JOB_SECRET?.trim() || null
}

export async function getGoogleSyncQueueStats(): Promise<GoogleSyncQueueStats> {
  await connectDB()
  const staleBefore = new Date(Date.now() - QUEUE_JOB_STALE_MS)

  const [
    queued,
    running,
    done,
    failed,
    stuckRunning,
    withSnapshot,
    approvedTotal,
    candidatePlaces,
  ] = await Promise.all([
    Place.countDocuments({ status: "approved", "googleSync.status": "queued" }),
    Place.countDocuments({ status: "approved", "googleSync.status": "running" }),
    Place.countDocuments({ status: "approved", "googleSync.status": "done" }),
    Place.countDocuments({ status: "approved", "googleSync.status": "failed" }),
    Place.countDocuments({
      status: "approved",
      "googleSync.status": "running",
      "googleSync.startedAt": { $lt: staleBefore },
    }),
    Place.countDocuments({
      status: "approved",
      "googleSnapshot.syncedAt": { $exists: true },
    }),
    Place.countDocuments({ status: "approved" }),
    Place.find({ status: "approved" })
      .select("googleSync googleSnapshot")
      .limit(5000)
      .lean(),
  ])

  const needsSync = candidatePlaces.filter((p) => placeNeedsGoogleSync(p)).length
  const stalled =
    (queued > 0 && running === 0) || stuckRunning > 0 || (queued > 0 && stuckRunning > 0)
  const coveragePct =
    approvedTotal > 0 ? Math.round((withSnapshot / approvedTotal) * 1000) / 10 : 0

  return {
    queued,
    running,
    done,
    failed,
    needsSync,
    withSnapshot,
    coveragePct,
    approvedTotal,
    workerActive: running > 0 && stuckRunning < running,
    stalled,
    stuckRunning,
  }
}

export async function resetStaleGoogleSyncJobs(): Promise<number> {
  await connectDB()
  const staleBefore = new Date(Date.now() - QUEUE_JOB_STALE_MS)
  const result = await Place.updateMany(
    {
      status: "approved",
      "googleSync.status": "running",
      $or: [
        { "googleSync.startedAt": { $lt: staleBefore } },
        { "googleSync.startedAt": { $exists: false } },
      ],
    },
    {
      $set: {
        "googleSync.status": "queued",
        "googleSync.error": undefined,
      },
    }
  )
  return result.modifiedCount
}

export async function enqueueGoogleSyncPlaces(): Promise<{
  queued: number
  skipped: number
}> {
  await connectDB()

  // Backfill googlePlaceId desde research si falta
  const needIdBackfill = await Place.find({
    status: "approved",
    $or: [{ googlePlaceId: { $exists: false } }, { googlePlaceId: null }, { googlePlaceId: "" }],
    "aiEnrichment.googlePlaceId": { $type: "string" },
  })
    .select("_id aiEnrichment.googlePlaceId")
    .limit(2000)
    .lean()

  for (const place of needIdBackfill) {
    const id = place.aiEnrichment?.googlePlaceId?.trim()
    if (!id) continue
    await Place.updateOne({ _id: place._id }, { $set: { googlePlaceId: id } })
  }

  const places = await Place.find({ status: "approved" })
    .select("googleSync googleSnapshot name")
    .sort({ updatedAt: 1 })
    .limit(5000)
    .lean()

  let queued = 0
  let skipped = 0

  for (const place of places) {
    const status = place.googleSync?.status
    if (status === "queued" || status === "running") {
      skipped++
      continue
    }
    if (!placeNeedsGoogleSync(place)) {
      skipped++
      continue
    }

    await Place.updateOne(
      { _id: place._id },
      {
        $set: {
          googleSync: {
            status: "queued",
            startedAt: new Date(),
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
      "googleSync.status": "queued",
    },
    {
      $set: {
        "googleSync.status": "running",
        "googleSync.startedAt": new Date(),
        "googleSync.error": undefined,
      },
    },
    {
      sort: { "googleSync.startedAt": 1, updatedAt: 1 },
      new: true,
      projection: { _id: 1 },
    }
  )
  return claimed?._id?.toString() ?? null
}

export async function processGoogleSyncQueueTick(): Promise<{
  processed: number
  remaining: number
}> {
  let processed = 0

  while (processed < MAX_PLACES_PER_TICK) {
    const placeId = await claimNextQueuedPlace()
    if (!placeId) break

    try {
      const result = await syncPlaceGoogleReviews(placeId)
      if (!result.ok) {
        logApiError(
          "processGoogleSyncQueueTick",
          new Error(`${placeId}: ${result.error ?? "sync falló"}`)
        )
      }
    } catch (err) {
      logApiError("processGoogleSyncQueueTick", err)
      await Place.updateOne(
        { _id: placeId, "googleSync.status": "running" },
        {
          $set: {
            googleSync: {
              status: "failed",
              ranAt: new Date(),
              error:
                err instanceof Error
                  ? err.message
                  : "Error al procesar sync Google",
            },
          },
        }
      )
    }

    processed++
  }

  const remaining = await Place.countDocuments({
    status: "approved",
    "googleSync.status": "queued",
  })

  return { processed, remaining }
}

function scheduleNextGoogleSyncWorker(): void {
  const secret = getInternalJobSecret()
  if (!secret) {
    logApiError(
      "scheduleNextGoogleSyncWorker",
      new Error("INTERNAL_JOB_SECRET no configurado — la cola Google no puede encadenarse"),
      {}
    )
    return
  }

  const baseUrl = getBaseUrl()
  const task = fetch(`${baseUrl}/api/internal/google-sync-queue/run`, {
    method: "POST",
    headers: {
      "x-internal-job-secret": secret,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  }).catch((err) => {
    logApiError("scheduleNextGoogleSyncWorker", err, {})
  })

  try {
    waitUntil(task)
  } catch {
    void task
  }
}

export async function runGoogleSyncQueueWorker(): Promise<void> {
  try {
    await resetStaleGoogleSyncJobs()
    const { remaining } = await processGoogleSyncQueueTick()
    if (remaining > 0) scheduleNextGoogleSyncWorker()
  } catch (err) {
    logApiError("runGoogleSyncQueueWorker", err, {})
    const remaining = await Place.countDocuments({
      status: "approved",
      "googleSync.status": "queued",
    }).catch(() => 0)
    if (remaining > 0) scheduleNextGoogleSyncWorker()
  }
}

export async function startGoogleSyncQueue(): Promise<{
  queued: number
  skipped: number
  stats: GoogleSyncQueueStats
}> {
  await resetStaleGoogleSyncJobs()
  const { queued, skipped } = await enqueueGoogleSyncPlaces()
  const stats = await getGoogleSyncQueueStats()
  if (stats.queued > 0 || stats.stuckRunning > 0) {
    scheduleNextGoogleSyncWorker()
  }
  const latestStats = await getGoogleSyncQueueStats()
  return { queued, skipped, stats: latestStats }
}

export async function resumeGoogleSyncQueue(): Promise<GoogleSyncQueueStats> {
  await resetStaleGoogleSyncJobs()
  const stats = await getGoogleSyncQueueStats()
  if (stats.queued > 0 || stats.stuckRunning > 0) {
    scheduleNextGoogleSyncWorker()
  }
  return getGoogleSyncQueueStats()
}

export { isValidInternalJobRequest }
