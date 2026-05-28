import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { VentureSuggestion } from "@/models/VentureSuggestion"
import { requireAuth } from "@/lib/middleware"
import { checkRateLimit, checkRateLimitByIp } from "@/lib/rate-limit"
import { logApiError } from "@/lib/logger"
import { ventureSuggestionSchema } from "@/lib/validations"
import { sendVentureSuggestionNewEmail } from "@/lib/email-ventures"
import mongoose from "mongoose"
import { ZodError } from "zod"
import { invalidateApiCache } from "@/lib/api-cache"
import type { VentureModalityId } from "@/lib/venture-constants"

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request)
    if (session instanceof NextResponse) return session

    await connectDB()

    const [userLimit, ipLimit] = await Promise.all([
      checkRateLimit(session.user.id, "venture_suggestion", 50),
      checkRateLimitByIp(request, "venture_suggestion_ip", 50, 1440),
    ])
    if (!userLimit.allowed) {
      return NextResponse.json(
        { error: `Límite alcanzado. Quedan ${userLimit.remaining} sugerencias hoy.` },
        { status: 429 }
      )
    }
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes desde esta dirección. Volvé mañana." },
        { status: 429 }
      )
    }

    const body = await request.json()
    const validated = ventureSuggestionSchema.parse(body)

    const { suggesterComment, shipsNationwide, ...draftFields } = validated
    const modalities = [...(draftFields.modalities ?? [])] as VentureModalityId[]
    if (shipsNationwide && !modalities.includes("envios")) {
      modalities.push("envios")
    }

    const ventureDraft = {
      ...draftFields,
      modalities,
      status: "pending" as const,
    }

    const suggestion = new VentureSuggestion({
      ventureDraft,
      suggesterComment,
      shipsNationwide,
      suggestedByUserId: new mongoose.Types.ObjectId(session.user.id),
      status: "pending",
    })

    await suggestion.save()
    invalidateApiCache(["admin:counts"])

    sendVentureSuggestionNewEmail({
      ventureDraft: ventureDraft as Record<string, unknown>,
      suggestedByName: session.user.name ?? "Usuario",
      suggestedByEmail: session.user.email ?? "",
      suggesterComment,
      shipsNationwide,
    }).catch(() => {})

    return NextResponse.json(suggestion, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.errors },
        { status: 400 }
      )
    }
    logApiError("/api/venture-suggestions", error, { request })
    return NextResponse.json({ error: "Error al crear sugerencia" }, { status: 500 })
  }
}
