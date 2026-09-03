import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import type { IPlace } from "@/models/Place"
import { requireAdmin } from "@/lib/middleware"
import { logApiError } from "@/lib/logger"
import { invalidateApiCache } from "@/lib/api-cache"
import { isPlaceResearchEnabled } from "@/lib/place-research/config"
import { buildPlacePatchSet } from "@/lib/place-research/apply-place-patch"
import { runPlaceResearch } from "@/lib/place-research/run-place-research"
import mongoose from "mongoose"

export const maxDuration = 60

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin(request)
    if (session instanceof NextResponse) return session

    if (!isPlaceResearchEnabled()) {
      return NextResponse.json(
        { error: "Investigación IA no configurada (OPENROUTER_API_KEY)" },
        { status: 503 }
      )
    }

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    await connectDB()
    const place = await Place.findById(params.id)
    if (!place) {
      return NextResponse.json({ error: "Lugar no encontrado" }, { status: 404 })
    }

    if (place.status === "approved") {
      return NextResponse.json(
        { error: "Solo se investigan lugares pendientes / no publicados" },
        { status: 400 }
      )
    }

    const result = await runPlaceResearch(params.id)
    const updated = await Place.findById(params.id).lean()

    return NextResponse.json({ aiEnrichment: result, place: updated })
  } catch (error: unknown) {
    logApiError("/api/admin/places/[id]/research", error, { request })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error en investigación" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin(request)
    if (session instanceof NextResponse) return session

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    const body = (await request.json()) as {
      action?: string
      includeRecommendedSafety?: boolean
    }

    if (body.action !== "apply_patch") {
      return NextResponse.json({ error: "Acción no válida" }, { status: 400 })
    }

    await connectDB()
    const place = await Place.findById(params.id)
    if (!place) {
      return NextResponse.json({ error: "Lugar no encontrado" }, { status: 404 })
    }

    if (place.status === "approved") {
      return NextResponse.json(
        { error: "Solo se investigan lugares pendientes / no publicados" },
        { status: 400 }
      )
    }

    const patch: Partial<IPlace> = {
      ...(place.aiEnrichment?.suggestedDraftPatch as Partial<IPlace> | undefined),
    }

    if (body.includeRecommendedSafety && place.aiEnrichment?.recommendedSafetyLevel) {
      patch.safetyLevel = place.aiEnrichment.recommendedSafetyLevel
    }

    const $set = buildPlacePatchSet(place, patch)
    if (!Object.keys($set).length) {
      return NextResponse.json(
        { error: "No hay datos sugeridos para aplicar" },
        { status: 400 }
      )
    }

    await Place.updateOne({ _id: place._id }, { $set })
    invalidateApiCache(["public:places:", "admin:places:", "admin:counts", "seo:province:"])

    const updated = await Place.findById(params.id).lean()
    return NextResponse.json({ message: "Datos aplicados", place: updated })
  } catch (error: unknown) {
    logApiError("/api/admin/places/[id]/research PATCH", error, { request })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al aplicar datos" },
      { status: 500 }
    )
  }
}
