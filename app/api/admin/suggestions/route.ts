import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Suggestion } from "@/models/Suggestion"
import { Place } from "@/models/Place"
import { requireAdmin } from "@/lib/middleware"
import { logApiError } from "@/lib/logger"
import { findDuplicateCandidates, type DuplicateDraft } from "@/lib/place-duplicates"

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
    const suggestionsWithDuplicates = suggestions.map((suggestion) => {
      const currentSuggestionId = suggestion._id.toString()
      const candidates = duplicateCandidates.filter(
        (candidate) => candidate._id?.toString() !== currentSuggestionId
      )

      return {
        ...suggestion,
        duplicateCandidates: findDuplicateCandidates(
          suggestion.placeDraft as DuplicateDraft,
          candidates
        ),
      }
    })
    
    return NextResponse.json({ suggestions: suggestionsWithDuplicates })
  } catch (error) {
    logApiError("/api/admin/suggestions", error, { request })
    return NextResponse.json(
      { error: "Error al obtener sugerencias" },
      { status: 500 }
    )
  }
}

async function loadDuplicateCandidates(): Promise<Array<DuplicateDraft & { kind: "place" | "suggestion" }>> {
  const [places, pendingSuggestions] = await Promise.all([
    Place.find(
      { status: "approved" },
      {
        name: 1,
        address: 1,
        addressText: 1,
        neighborhood: 1,
        location: 1,
        contact: 1,
        status: 1,
      }
    )
      .limit(5000)
      .lean(),
    Suggestion.find(
      { status: "pending" },
      {
        placeDraft: 1,
        status: 1,
      }
    ).lean(),
  ])

  const placeCandidates = places.map((place) => ({
    ...place,
    kind: "place" as const,
  }))

  const suggestionCandidates = pendingSuggestions.map((suggestion) => ({
    _id: suggestion._id,
    ...((suggestion.placeDraft as DuplicateDraft) || {}),
    status: suggestion.status,
    kind: "suggestion" as const,
  }))

  return [...placeCandidates, ...suggestionCandidates]
}
