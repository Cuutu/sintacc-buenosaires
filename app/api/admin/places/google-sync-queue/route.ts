import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/middleware"
import { logApiError } from "@/lib/logger"
import { getGoogleMapsApiKey } from "@/lib/google-places"
import {
  getGoogleSyncQueueStats,
  resumeGoogleSyncQueue,
  startGoogleSyncQueue,
} from "@/lib/google-sync-queue"
import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"

export const maxDuration = 60

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin(request)
    if (session instanceof NextResponse) return session

    const stats = await getGoogleSyncQueueStats()

    await connectDB()
    const places = await Place.find({
      status: "approved",
      "googleSync.status": { $in: ["queued", "running", "failed", "done"] },
    })
      .select("name address neighborhood googlePlaceId googleSnapshot googleSync")
      .sort({ "googleSync.ranAt": -1, "googleSync.startedAt": -1 })
      .limit(80)
      .lean()

    return NextResponse.json({
      ...stats,
      configured: Boolean(getGoogleMapsApiKey()),
      places: places.map((p) => ({
        _id: p._id.toString(),
        name: p.name,
        address: p.address,
        neighborhood: p.neighborhood,
        googlePlaceId: p.googlePlaceId,
        syncStatus: p.googleSync?.status,
        syncError: p.googleSync?.error,
        rating: p.googleSnapshot?.rating,
        userRatingCount: p.googleSnapshot?.userRatingCount,
        syncedAt: p.googleSnapshot?.syncedAt,
        glutenRelevantCount: p.googleSnapshot?.glutenRelevant?.length ?? 0,
      })),
    })
  } catch (error) {
    logApiError("/api/admin/places/google-sync-queue", error, { request })
    return NextResponse.json({ error: "Error al leer cola Google" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin(request)
    if (session instanceof NextResponse) return session

    if (!getGoogleMapsApiKey()) {
      return NextResponse.json(
        { error: "Google Places API no configurada" },
        { status: 503 }
      )
    }

    const body = (await request.json().catch(() => ({}))) as { action?: string }

    if (body.action === "resume") {
      const stats = await resumeGoogleSyncQueue()
      return NextResponse.json({ message: "Cola Google reanudada", stats })
    }

    const result = await startGoogleSyncQueue()
    return NextResponse.json({
      message:
        result.queued > 0
          ? `Cola iniciada con ${result.queued} lugares`
          : "No había lugares nuevos para sincronizar",
      ...result,
    })
  } catch (error) {
    logApiError("/api/admin/places/google-sync-queue POST", error, { request })
    return NextResponse.json({ error: "Error al iniciar cola Google" }, { status: 500 })
  }
}
