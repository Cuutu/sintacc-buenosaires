import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin } from "@/lib/middleware"
import { generateSocialImage } from "@/lib/social/generate-image"
import { logApiError } from "@/lib/logger"

export const maxDuration = 90

const generateSchema = z.object({
  preset: z.enum([
    "latest_places",
    "latest_ventures",
    "neighborhood",
    "dedicated_gf",
    "milestone",
    "cta_suggest",
  ]),
  platform: z.enum(["instagram", "tiktok"]).default("instagram"),
  limit: z.number().int().min(1).max(15).optional(),
  days: z.number().int().min(0).max(365).optional(),
  communityOnly: z.boolean().optional(),
  neighborhood: z.string().trim().optional(),
  excludeIds: z.array(z.string()).optional(),
  imageFormat: z.enum(["story", "feed"]).optional(),
  includeLogo: z.boolean().optional(),
  includePhotos: z.boolean().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin(request)
    if (session instanceof NextResponse) return session

    const body = await request.json()
    const validated = generateSchema.parse(body)

    const result = await generateSocialImage(validated)

    return NextResponse.json(result)
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.errors },
        { status: 400 }
      )
    }
    if (error instanceof Error) {
      if (error.message === "Seleccioná un barrio") {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      if (
        error.message.includes("OPENROUTER") ||
        error.message.includes("OpenRouter") ||
        error.message.includes("Créditos")
      ) {
        return NextResponse.json({ error: error.message }, { status: 402 })
      }
      if (error.message.includes("Cloudinary")) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      if (error.message.includes("No hay ítems")) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }
    logApiError("/api/admin/social/generate-image", error, { request })
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Error al generar imagen",
      },
      { status: 500 }
    )
  }
}
