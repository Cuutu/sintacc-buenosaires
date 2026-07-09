import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import { requireAdmin } from "@/lib/middleware"
import { logApiError } from "@/lib/logger"
import {
  countMissingEnrichmentFields,
  isPlaceInformationIncomplete,
} from "@/lib/place-incomplete"
import { getEnrichmentQueueStats, startEnrichmentQueue } from "@/lib/place-enrichment-queue"
import { isPlaceResearchEnabled } from "@/lib/place-research/config"

export const maxDuration = 60

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin(request)
    if (session instanceof NextResponse) return session

    await connectDB()
    const places = await Place.find({ status: "approved" })
      .select("name address neighborhood type types contact openingHours photos safetyLevel aiEnrichment")
      .sort({ updatedAt: -1 })
      .limit(3000)
      .lean()

    const incomplete = places
      .filter((place) => isPlaceInformationIncomplete(place))
      .map((place) => ({
        _id: place._id.toString(),
        name: place.name,
        address: place.address,
        neighborhood: place.neighborhood,
        type: place.types?.[0] || place.type,
        missing: countMissingEnrichmentFields(place),
        enrichmentStatus: place.aiEnrichment?.status ?? "pending",
        enrichmentSummary: place.aiEnrichment?.summary,
      }))

    const queue = await getEnrichmentQueueStats()

    return NextResponse.json({
      total: incomplete.length,
      places: incomplete,
      queue,
    })
  } catch (error) {
    logApiError("/api/admin/places/incomplete", error, { request })
    return NextResponse.json({ error: "Error al listar lugares incompletos" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin(request)
    if (session instanceof NextResponse) return session

    if (!isPlaceResearchEnabled()) {
      return NextResponse.json(
        { error: "Investigación IA no configurada (OPENROUTER_API_KEY)" },
        { status: 503 }
      )
    }

    const result = await startEnrichmentQueue()
    return NextResponse.json(result)
  } catch (error) {
    logApiError("/api/admin/places/incomplete", error, { request })
    return NextResponse.json({ error: "Error al enriquecer lugares" }, { status: 500 })
  }
}
