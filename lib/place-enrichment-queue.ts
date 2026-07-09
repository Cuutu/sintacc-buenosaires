import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import { getBaseUrl } from "@/lib/base-url"
import { logApiError } from "@/lib/logger"
import { isPlaceInformationIncomplete } from "@/lib/place-incomplete"
import { runPlaceResearch } from "@/lib/place-research/run-place-research"
import { waitUntil } from "@vercel/functions"

const MAX_PLACES_PER_TICK = 10
const MAX_TICK_MS = 52_000
const ENQUEUE_LIMIT = 500

export type EnrichmentQueueStats = {
  queued: number
  running: number
  done: number
  failed: number
  incomplete: number
  workerActive: boolean
}

function getInternalJobSecret(): string | null {
  return process.env.INTERNAL_JOB_SECRET?.trim() || null
}

export async function getEnrichmentQueueStats(): Promise<EnrichmentQueueStats> {
  await connectDB()
  const [queued, running, done, failed, places] = await Promise.all([
    Place.countDocuments({ status: "approved", "aiEnrichment.status": "queued" }),
    Place.countDocuments({ status: "approved", "aiEnrichment.status": "running" }),
    Place.countDocuments({ status: "approved", "aiEnrichment.status": "done" }),
    Place.countDocuments({ status: "approved", "aiEnrichment.status": "failed" }),
    Place.find({ status: "approved" })
      .select("name address neighborhood type types contact openingHours photos safetyLevel")
      .limit(3000)
      .lean(),
  ])

  const incomplete = places.filter((place) => isPlaceInformationIncomplete(place)).length

  return {
    queued,
    running,
    done,
    failed,
    incomplete,
    workerActive: queued > 0 || running > 0,
  }
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

export async function processEnrichmentQueueTick(): Promise<{
  processed: number
  remaining: number
}> {
  const startedAt = Date.now()
  let processed = 0

  while (processed < MAX_PLACES_PER_TICK && Date.now() - startedAt < MAX_TICK_MS) {
    await connectDB()
    const next = await Place.findOne({
      status: "approved",
      "aiEnrichment.status": "queued",
    })
      .sort({ "aiEnrichment.startedAt": 1, updatedAt: 1 })
      .select("_id")

    if (!next) break

    try {
      await runPlaceResearch(next._id.toString())
    } catch (err) {
      logApiError("processEnrichmentQueueTick", err, {})
    }

    processed++
  }

  const remaining = await Place.countDocuments({
    status: "approved",
    "aiEnrichment.status": "queued",
  })

  return { processed, remaining }
}

async function invokeQueueWorker(): Promise<void> {
  const secret = getInternalJobSecret()
  const baseUrl = getBaseUrl()

  if (secret) {
    try {
      await fetch(`${baseUrl}/api/internal/place-enrichment-queue/run`, {
        method: "POST",
        headers: {
          "x-internal-job-secret": secret,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      })
      return
    } catch (err) {
      logApiError("invokeQueueWorker/fetch", err, {})
    }
  }

  await runEnrichmentQueueWorker()
}

export async function runEnrichmentQueueWorker(): Promise<void> {
  try {
    const { remaining } = await processEnrichmentQueueTick()
    if (remaining > 0) {
      if (getInternalJobSecret()) {
        await invokeQueueWorker()
      } else {
        triggerEnrichmentQueueWorker()
      }
    }
  } catch (err) {
    logApiError("runEnrichmentQueueWorker", err, {})
  }
}

export function triggerEnrichmentQueueWorker(): void {
  const task = runEnrichmentQueueWorker().catch((err) => {
    logApiError("triggerEnrichmentQueueWorker", err, {})
  })

  try {
    waitUntil(task)
  } catch {
    void task
  }
}

export async function startEnrichmentQueue(): Promise<{
  queued: number
  skipped: number
  stats: EnrichmentQueueStats
}> {
  const { queued, skipped } = await enqueueIncompletePlaces()
  if (queued > 0) {
    triggerEnrichmentQueueWorker()
  }
  const stats = await getEnrichmentQueueStats()
  return { queued, skipped, stats }
}

export function isValidInternalJobRequest(secret: string | null): boolean {
  const expected = getInternalJobSecret()
  if (!expected) return false
  return Boolean(secret && secret === expected)
}
