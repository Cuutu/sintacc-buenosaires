import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin } from "@/lib/middleware"
import { buildSocialPreview } from "@/lib/social/preview"
import { logApiError } from "@/lib/logger"

const previewSchema = z.object({
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
})

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin(request)
    if (session instanceof NextResponse) return session

    const body = await request.json()
    const validated = previewSchema.parse(body)

    const result = await buildSocialPreview(validated)

    return NextResponse.json(result)
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.errors },
        { status: 400 }
      )
    }
    if (error.message === "Seleccioná un barrio") {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    logApiError("/api/admin/social/preview", error, { request })
    return NextResponse.json({ error: "Error al generar preview" }, { status: 500 })
  }
}
