import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/middleware"
import { fetchSocialItems } from "@/lib/social/queries"
import type { SocialPreset } from "@/lib/social/types"
import { logApiError } from "@/lib/logger"

const VALID_PRESETS: SocialPreset[] = [
  "latest_places",
  "latest_ventures",
  "neighborhood",
  "dedicated_gf",
  "milestone",
  "cta_suggest",
]

function parsePreset(value: string | null): SocialPreset | null {
  if (!value || !VALID_PRESETS.includes(value as SocialPreset)) return null
  return value as SocialPreset
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin(request)
    if (session instanceof NextResponse) return session

    const params = request.nextUrl.searchParams
    const preset = parsePreset(params.get("preset"))
    if (!preset) {
      return NextResponse.json({ error: "Preset inválido" }, { status: 400 })
    }

    const limit = Math.min(15, Math.max(1, parseInt(params.get("limit") || "10", 10)))
    const days = Math.min(365, Math.max(0, parseInt(params.get("days") || "30", 10)))
    const communityOnly = params.get("communityOnly") !== "false"
    const neighborhood = params.get("neighborhood")?.trim() || undefined
    const excludeRaw = params.get("excludeIds")?.trim()
    const excludeIds = excludeRaw ? excludeRaw.split(",").filter(Boolean) : []

    const result = await fetchSocialItems({
      preset,
      limit,
      days,
      communityOnly,
      neighborhood,
      excludeIds,
    })

    return NextResponse.json(result)
  } catch (error: any) {
    if (error.message === "Seleccioná un barrio") {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    logApiError("/api/admin/social/digest", error, { request })
    return NextResponse.json({ error: "Error al obtener contenido" }, { status: 500 })
  }
}
