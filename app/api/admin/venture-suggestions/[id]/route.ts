import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { VentureSuggestion } from "@/models/VentureSuggestion"
import { Venture } from "@/models/Venture"
import { User } from "@/models/User"
import { requireAdmin } from "@/lib/middleware"
import { ventureDraftUpdateSchema, ventureSchema } from "@/lib/validations"
import { sendVentureApprovedEmail } from "@/lib/email-ventures"
import { logApiError } from "@/lib/logger"
import mongoose from "mongoose"
import { ZodError } from "zod"
import { invalidateApiCache } from "@/lib/api-cache"
import { withGeneratedVentureSlug } from "@/lib/venture-save"

function buildVentureFromDraft(draft: Record<string, unknown>) {
  const parsed = ventureSchema.parse({
    ...draft,
    photos: (draft.photos as string[])?.length ? draft.photos : [],
  })
  return { ...parsed, status: "approved" as const, source: "suggestion" as const }
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
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    const body = await request.json()
    const { action, ventureDraft: incomingDraft } = body

    const suggestion = await VentureSuggestion.findById(params.id)
    if (!suggestion) {
      return NextResponse.json({ error: "Sugerencia no encontrada" }, { status: 404 })
    }

    if (incomingDraft && !action) {
      const parsed = ventureDraftUpdateSchema.parse(incomingDraft)
      const current = (suggestion.ventureDraft as Record<string, unknown>) || {}
      suggestion.ventureDraft = { ...current, ...parsed } as typeof suggestion.ventureDraft
      await suggestion.save()
      return NextResponse.json({ message: "Borrador actualizado", suggestion })
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Acción inválida" }, { status: 400 })
    }

    if (action === "approve") {
      const currentDraft = suggestion.ventureDraft as Record<string, unknown>
      const draft = incomingDraft
        ? { ...currentDraft, ...ventureDraftUpdateSchema.parse(incomingDraft) }
        : currentDraft

      const ventureData = buildVentureFromDraft(draft)
      const ventureDataWithSlug = await withGeneratedVentureSlug(ventureData)
      const venture = new Venture(ventureDataWithSlug)
      await venture.save()
      invalidateApiCache(["public:ventures:", "admin:ventures:", "admin:counts"])

      suggestion.status = "approved"
      await suggestion.save()

      const user = await User.findById(suggestion.suggestedByUserId).select("email").lean()
      if (user?.email) {
        sendVentureApprovedEmail({
          userEmail: user.email,
          ventureName: ventureData.name,
          ventureSlug: ventureDataWithSlug.slug,
        }).catch(() => {})
      }

      return NextResponse.json({
        message: "Sugerencia aprobada",
        venture,
        suggestion,
      })
    }

    suggestion.status = "rejected"
    await suggestion.save()
    invalidateApiCache(["admin:counts"])
    return NextResponse.json({ message: "Sugerencia rechazada", suggestion })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Datos inválidos", details: error.errors }, { status: 400 })
    }
    logApiError("/api/admin/venture-suggestions/[id]", error, { request })
    return NextResponse.json({ error: "Error al procesar sugerencia" }, { status: 500 })
  }
}
