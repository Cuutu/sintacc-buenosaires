import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Venture } from "@/models/Venture"
import { requireAdmin } from "@/lib/middleware"
import { ventureSchema } from "@/lib/validations"
import { withGeneratedVentureSlug } from "@/lib/venture-save"
import { logApiError } from "@/lib/logger"
import { invalidateApiCache } from "@/lib/api-cache"
import { ZodError } from "zod"

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin(request)
    if (session instanceof NextResponse) return session

    await connectDB()

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status")
    const search = searchParams.get("search")?.trim()
    const category = searchParams.get("category")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const skip = (page - 1) * limit

    const query: Record<string, unknown> = {}
    if (status === "approved" || status === "pending") query.status = status
    if (category) query.category = category
    if (search && search.length >= 2) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
      query.$or = [{ name: regex }, { zone: regex }]
    }

    const [ventures, total] = await Promise.all([
      Venture.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Venture.countDocuments(query),
    ])

    return NextResponse.json({
      ventures,
      total,
      page,
      pages: Math.ceil(total / limit),
    })
  } catch (error) {
    logApiError("/api/admin/ventures", error, { request })
    return NextResponse.json({ error: "Error al obtener emprendimientos" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin(request)
    if (session instanceof NextResponse) return session

    await connectDB()

    const body = await request.json()
    const parsed = ventureSchema.parse({ ...body, source: "manual", status: body.status ?? "approved" })
    const withSlug = await withGeneratedVentureSlug(parsed)
    const venture = new Venture(withSlug)
    await venture.save()
    invalidateApiCache(["public:ventures:", "admin:ventures:", "admin:counts"])

    return NextResponse.json(venture, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Datos inválidos", details: error.errors }, { status: 400 })
    }
    logApiError("/api/admin/ventures POST", error, { request })
    return NextResponse.json({ error: "Error al crear emprendimiento" }, { status: 500 })
  }
}
