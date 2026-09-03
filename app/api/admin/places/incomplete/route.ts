import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import { requireAdmin } from "@/lib/middleware"
import { logApiError } from "@/lib/logger"
import {
  countMissingConcreteFields,
  isPlaceEnrichmentReviewCandidate,
  isPlaceInformationIncomplete,
  isPlaceMissingTaccClassification,
} from "@/lib/place-incomplete"
import { placeQualityChecks } from "@/lib/place-completeness"
import {
  catalogStatusFilter,
  getEnrichmentQueueStats,
  startEnrichmentQueue,
  type EnrichmentCatalog,
} from "@/lib/place-enrichment-queue"
import { isPlaceResearchEnabled } from "@/lib/place-research/config"
import type { AiResearch } from "@/lib/place-research/types"

function parseCatalog(value: string | null | undefined): EnrichmentCatalog {
  if (value === "pending" || value === "all" || value === "approved") return value
  return "approved"
}

function missingLabels(place: {
  name?: string
  address?: string
  neighborhood?: string
  type?: string
  photos?: string[]
  openingHours?: string
  location?: { lat?: number; lng?: number } | null
  contact?: { instagram?: string; url?: string; phone?: string; whatsapp?: string }
  safetyLevel?: string
  tags?: string[]
  description?: string
  catalog: EnrichmentCatalog
}): string[] {
  if (place.catalog === "approved") return countMissingConcreteFields(place)
  const quality = placeQualityChecks(place)
    .filter((row) => !row.ok && row.id !== "seo")
    .map((row) => row.label)
  if (isPlaceMissingTaccClassification(place)) quality.push("clasificación TACC")
  return quality
}

export const maxDuration = 60

function serializeAiResearch(ai?: AiResearch | null) {
  if (!ai) return undefined
  const startedAt =
    ai.startedAt instanceof Date ? ai.startedAt.toISOString() : ai.startedAt
  const ranAt = ai.ranAt instanceof Date ? ai.ranAt.toISOString() : ai.ranAt
  return { ...ai, startedAt, ranAt }
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin(request)
    if (session instanceof NextResponse) return session

    await connectDB()
    const catalog = parseCatalog(request.nextUrl.searchParams.get("catalog"))
    const places = await Place.find(catalogStatusFilter(catalog))
      .select(
        "name address neighborhood type types contact openingHours photos safetyLevel tags description location status aiEnrichment"
      )
      .sort({ updatedAt: -1 })
      .limit(3000)
      .lean()

    const reviewPlaces = places
      .filter((place) =>
        catalog === "approved" ? isPlaceEnrichmentReviewCandidate(place) : true
      )
      .map((place) => ({
        _id: place._id.toString(),
        name: place.name,
        status: place.status,
        address: place.address,
        neighborhood: place.neighborhood,
        type: place.types?.[0] || place.type,
        missing: missingLabels({ ...place, catalog }),
        enrichmentStatus: place.aiEnrichment?.status ?? "pending",
        enrichmentSummary: place.aiEnrichment?.summary,
        aiEnrichment: serializeAiResearch(place.aiEnrichment as AiResearch | undefined),
        stillIncomplete:
          catalog === "approved"
            ? isPlaceMissingTaccClassification(place)
            : isPlaceInformationIncomplete(place) || isPlaceMissingTaccClassification(place),
      }))

    const queue = await getEnrichmentQueueStats(catalog)

    return NextResponse.json({
      total: reviewPlaces.length,
      incompleteCount: reviewPlaces.filter((place) => place.stillIncomplete).length,
      places: reviewPlaces,
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

    const body = (await request.json().catch(() => ({}))) as { catalog?: EnrichmentCatalog }
    const catalog = parseCatalog(body.catalog ?? null)
    const result = await startEnrichmentQueue({ catalog })
    return NextResponse.json(result)
  } catch (error) {
    logApiError("/api/admin/places/incomplete", error, { request })
    return NextResponse.json({ error: "Error al enriquecer lugares" }, { status: 500 })
  }
}
