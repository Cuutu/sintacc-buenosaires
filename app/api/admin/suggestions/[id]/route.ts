import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Suggestion } from "@/models/Suggestion"
import { Place } from "@/models/Place"
import { User } from "@/models/User"
import { requireAdmin } from "@/lib/middleware"
import { sendSuggestionApprovedEmail, sendSuggestionRejectedEmail } from "@/lib/email-suggestions"
import { placeSchema, placeDraftUpdateSchema } from "@/lib/validations"
import { logApiError } from "@/lib/logger"
import mongoose from "mongoose"
import { ZodError } from "zod"
import { invalidateApiCache } from "@/lib/api-cache"
import { generateUniquePlaceSlug } from "@/lib/place-slugs"

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

function getRejectionReason(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
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
    const { action, placeDraft: incomingDraft, rejectionReason } = body

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
      const place = new Place({ ...placeData, source: "suggestion" })
      place.slug = await generateUniquePlaceSlug(place.name, place.neighborhood)
      await place.save()
      invalidateApiCache(["public:places:", "admin:places:", "admin:counts"])

      suggestion.status = "approved"
      await suggestion.save()

      // Email al usuario que sugirió (no bloquea la respuesta)
      const user = await User.findById(suggestion.suggestedByUserId).select("email").lean()
      if (user?.email) {
        sendSuggestionApprovedEmail({
          userEmail: user.email,
          placeName: (placeData.name as string) || "Lugar",
          placeId: place.slug || place._id.toString(),
        }).catch(() => {})
      }

      return NextResponse.json({
        message: "Sugerencia aprobada y lugar creado",
        place,
        suggestion,
      })
    } else {
      const reason = getRejectionReason(rejectionReason)
      if (!reason) {
        return NextResponse.json(
          { error: "Escribi un motivo para rechazar la sugerencia" },
          { status: 400 }
        )
      }

      suggestion.status = "rejected"
      suggestion.rejectionReason = reason
      suggestion.rejectedAt = new Date()
      if (session.user.id && mongoose.Types.ObjectId.isValid(session.user.id)) {
        suggestion.rejectedByUserId = new mongoose.Types.ObjectId(session.user.id)
      }
      await suggestion.save()
      invalidateApiCache(["admin:counts"])

      const user = await User.findById(suggestion.suggestedByUserId).select("email").lean()
      if (user?.email) {
        const draft = (suggestion.placeDraft as Record<string, unknown>) || {}
        sendSuggestionRejectedEmail({
          userEmail: user.email,
          placeName: (draft.name as string) || "Lugar sugerido",
          rejectionReason: reason,
        }).catch(() => {})
      }

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
    logApiError("/api/admin/suggestions/[id]", error, { request })
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
    const place = new Place({ ...placeData, source: "suggestion" })
    place.slug = await generateUniquePlaceSlug(place.name, place.neighborhood)
    await place.save()
    invalidateApiCache(["public:places:", "admin:places:", "admin:counts"])

    suggestion.status = "approved"
    await suggestion.save()

    // Email al usuario que sugirió (no bloquea la respuesta)
    const user = await User.findById(suggestion.suggestedByUserId).select("email").lean()
    if (user?.email) {
      sendSuggestionApprovedEmail({
        userEmail: user.email,
        placeName: (placeData.name as string) || "Lugar",
        placeId: place.slug || place._id.toString(),
      }).catch(() => {})
    }

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
    logApiError("/api/admin/suggestions/[id]", error, { request })
    return NextResponse.json(
      { error: "Error al aprobar sugerencia" },
      { status: 500 }
    )
  }
}
