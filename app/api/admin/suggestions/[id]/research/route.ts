import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Suggestion } from "@/models/Suggestion"
import { requireAdmin } from "@/lib/middleware"
import { checkRateLimit } from "@/lib/rate-limit"
import { logApiError } from "@/lib/logger"
import { isPlaceResearchEnabled } from "@/lib/place-research/config"
import { runSuggestionResearch } from "@/lib/place-research/run-research"
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

    const limit = await checkRateLimit(session.user.id, "suggestion_research", 20)
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Límite de investigaciones IA alcanzado (20/día)" },
        { status: 429 }
      )
    }

    await connectDB()
    const suggestion = await Suggestion.findById(params.id)
    if (!suggestion) {
      return NextResponse.json({ error: "Sugerencia no encontrada" }, { status: 404 })
    }
    if (suggestion.status !== "pending") {
      return NextResponse.json(
        { error: "Solo sugerencias pendientes" },
        { status: 400 }
      )
    }

    const result = await runSuggestionResearch(params.id)

    const updated = await Suggestion.findById(params.id).lean()
    return NextResponse.json({ aiResearch: result, suggestion: updated })
  } catch (error: unknown) {
    logApiError("/api/admin/suggestions/[id]/research", error, { request })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error en investigación" },
      { status: 500 }
    )
  }
}
