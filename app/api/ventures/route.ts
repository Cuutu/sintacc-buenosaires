import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Venture } from "@/models/Venture"
import { parseVenturesSearchParams } from "@/lib/validations"
import { buildVentureSearchFilter } from "@/lib/venture-search"
import { logApiError } from "@/lib/logger"
import { getOrSetApiCache } from "@/lib/api-cache"

const CACHE_TTL_MS = 60 * 1000

export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const searchParams = request.nextUrl.searchParams
    let parsed
    try {
      parsed = parseVenturesSearchParams(searchParams)
    } catch {
      return NextResponse.json(
        { error: "Parámetros de búsqueda inválidos" },
        { status: 400 }
      )
    }

    const { page, limit, category, search } = parsed
    const skip = (page - 1) * limit

    const query: Record<string, unknown> = { status: "approved" }
    if (category) query.category = category
    const searchFilter = search ? buildVentureSearchFilter(search) : null
    if (searchFilter) {
      Object.assign(query, searchFilter)
    }

    const cacheKey = `public:ventures:${searchParams.toString()}`
    const data = await getOrSetApiCache(cacheKey, CACHE_TTL_MS, async () => {
      const ventures = await Venture.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
      const total = await Venture.countDocuments(query)
      return { ventures, total, page, pages: Math.ceil(total / limit) }
    })

    return NextResponse.json(data)
  } catch (error) {
    logApiError("/api/ventures", error, { request })
    return NextResponse.json({ error: "Error al obtener emprendimientos" }, { status: 500 })
  }
}
