import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import { requireAdmin } from "@/lib/middleware"
import { logApiError } from "@/lib/logger"
import { isPlaceResearchEnabled } from "@/lib/place-research/config"
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
