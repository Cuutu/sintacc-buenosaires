import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Suggestion } from "@/models/Suggestion"
import { requireAdmin } from "@/lib/middleware"
import { logApiError } from "@/lib/logger"
import { findDuplicateCandidates, getDuplicateMatchLevel, type DuplicateDraft } from "@/lib/place-duplicates"
import { loadDuplicateCandidates } from "@/lib/place-duplicates-loader"

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin(request)
    if (session instanceof NextResponse) return session
    
    await connectDB()
    
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status") || "pending"
    const search = searchParams.get("search")?.trim()

    const query: Record<string, unknown> = { status }
    if (search && search.length >= 2) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
      query.$or = [
        { "placeDraft.name": regex },
        { "placeDraft.address": regex },
        { "placeDraft.neighborhood": regex },
      ]
    }

    const suggestions = await Suggestion.find(query)
      .populate("suggestedByUserId", "name email")
      .sort({ createdAt: -1 })
      .lean()

    const duplicateCandidates = await loadDuplicateCandidates()
    const suggestionsWithDuplicates = suggestions.map((suggestion) => ({
      ...suggestion,
      duplicateCandidates: findDuplicateCandidates(
        suggestion.placeDraft as DuplicateDraft,
        duplicateCandidates.filter(
          (candidate) => candidate._id?.toString() !== suggestion._id.toString()
        )
      ).map((candidate) => ({
        ...candidate,
        matchLevel: getDuplicateMatchLevel(candidate.reasons, candidate.score) ?? "likely",
      })),
    }))
    
    return NextResponse.json({ suggestions: suggestionsWithDuplicates })
  } catch (error) {
    logApiError("/api/admin/suggestions", error, { request })
    return NextResponse.json(
      { error: "Error al obtener sugerencias" },
      { status: 500 }
    )
  }
}
