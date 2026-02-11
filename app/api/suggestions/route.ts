import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Suggestion } from "@/models/Suggestion"
import { requireAuth } from "@/lib/middleware"
import {
  suggestionSchema,
  quickSuggestionSchema,
  isQuickSuggestion,
} from "@/lib/validations"
import mongoose from "mongoose"
import { ZodError } from "zod"

const CABA_CENTER = { lat: -34.6037, lng: -58.3816 }

function buildPlaceDraftFromQuick(data: { sourceLink: string; safetyLevel: string; name?: string }) {
  const isInstagram = /instagram\.com|instagr\.am/.test(data.sourceLink)
  const contact = isInstagram
    ? { instagram: data.sourceLink.trim(), url: undefined }
    : { instagram: undefined, url: data.sourceLink.trim() }

  return {
    name: data.name?.trim() || "A completar",
    type: "other" as const,
    types: ["other"] as const,
    address: "A completar - ver link",
    neighborhood: "A completar",
    location: CABA_CENTER,
    tags: [data.safetyLevel === "dedicated_gf" ? "100_gf" : "opciones_sin_tacc"],
    safetyLevel: data.safetyLevel as "dedicated_gf" | "gf_options",
    contact,
    status: "pending",
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request)
    if (session instanceof NextResponse) return session

    await connectDB()

    const body = await request.json()

    let placeDraft: Record<string, unknown>

    if (isQuickSuggestion(body)) {
      const validated = quickSuggestionSchema.parse(body)
      placeDraft = buildPlaceDraftFromQuick(validated)
    } else {
      if (body.types?.length && !body.type) {
        body.type = body.types[0]
      }
      const validated = suggestionSchema.parse(body)
      placeDraft = { ...validated, status: "pending" }
    }

    const suggestion = new Suggestion({
      placeDraft,
      suggestedByUserId: new mongoose.Types.ObjectId(session.user.id),
      status: "pending",
    })

    await suggestion.save()

    return NextResponse.json(suggestion, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error creating suggestion:", error)
    return NextResponse.json(
      { error: "Error al crear sugerencia" },
      { status: 500 }
    )
  }
}
