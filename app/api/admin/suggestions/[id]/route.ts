import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Suggestion } from "@/models/Suggestion"
import { Place } from "@/models/Place"
import { requireAdmin } from "@/lib/middleware"
import { placeSchema, placeDraftUpdateSchema } from "@/lib/validations"
import mongoose from "mongoose"
import { ZodError } from "zod"

function buildPlaceFromDraft(draft: Record<string, unknown>) {
  const placeData: Record<string, unknown> = {
    ...draft,
    photos: (draft.photos as string[])?.length ? draft.photos : [],
  }
  if (placeData.types && Array.isArray(placeData.types) && placeData.types.length > 0) {
    if (!placeData.type) placeData.type = placeData.types[0]
  }
  const parsed = placeSchema.parse(placeData)
  return { ...parsed, status: "approved" as const }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin(request)
    if (session instanceof NextResponse) return session

    await connectDB()

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { error: "ID inválido" },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { action, placeDraft: incomingDraft } = body

    const suggestion = await Suggestion.findById(params.id)
    if (!suggestion) {
      return NextResponse.json(
        { error: "Sugerencia no encontrada" },
        { status: 404 }
      )
    }

    // Solo actualizar placeDraft (editar antes de aprobar)
    if (incomingDraft && !action) {
      const parsed = placeDraftUpdateSchema.parse(incomingDraft)
      const current = (suggestion.placeDraft as Record<string, unknown>) || {}
      suggestion.placeDraft = { ...current, ...parsed } as any
      await suggestion.save()
      return NextResponse.json({
        message: "Borrador actualizado",
        suggestion,
      })
    }

    // approve o reject
    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Acción inválida. Use 'approve' o 'reject'" },
        { status: 400 }
      )
    }

    if (action === "approve") {
      const currentDraft = suggestion.placeDraft as Record<string, unknown>
      const draft = incomingDraft
        ? { ...currentDraft, ...placeDraftUpdateSchema.parse(incomingDraft) }
        : currentDraft

      const placeData = buildPlaceFromDraft(draft)
      const place = new Place(placeData)
      await place.save()

      suggestion.status = "approved"
      await suggestion.save()

      return NextResponse.json({
        message: "Sugerencia aprobada y lugar creado",
        place,
        suggestion,
      })
    } else {
      suggestion.status = "rejected"
      await suggestion.save()
      return NextResponse.json({
        message: "Sugerencia rechazada",
        suggestion,
      })
    }
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error processing suggestion:", error)
    return NextResponse.json(
      { error: "Error al procesar sugerencia" },
      { status: 500 }
    )
  }
}

/** POST: Aceptar sugerencia (crear lugar). Acepta placeDraft opcional para aprobar con ediciones. */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin(request)
    if (session instanceof NextResponse) return session

    await connectDB()

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { error: "ID inválido" },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const { placeDraft: incomingDraft } = body

    const suggestion = await Suggestion.findById(params.id)
    if (!suggestion) {
      return NextResponse.json(
        { error: "Sugerencia no encontrada" },
        { status: 404 }
      )
    }

    const currentDraft = suggestion.placeDraft as Record<string, unknown>
    const draft = incomingDraft
      ? { ...currentDraft, ...placeDraftUpdateSchema.parse(incomingDraft) }
      : currentDraft

    const placeData = buildPlaceFromDraft(draft)
    const place = new Place(placeData)
    await place.save()

    suggestion.status = "approved"
    await suggestion.save()

    return NextResponse.json({
      message: "Sugerencia aprobada y lugar creado",
      place,
      suggestion,
    })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error accepting suggestion:", error)
    return NextResponse.json(
      { error: "Error al aprobar sugerencia" },
      { status: 500 }
    )
  }
}
