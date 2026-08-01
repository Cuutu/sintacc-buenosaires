import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import mongoose from "mongoose"
import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import { requireAdmin } from "@/lib/middleware"
import { invalidateApiCache } from "@/lib/api-cache"
import { logApiError } from "@/lib/logger"
import { MAX_FEATURED_PLACES } from "@/lib/featured-places"

const putSchema = z.object({
  placeIds: z.array(z.string().min(1)).max(MAX_FEATURED_PLACES),
})

/**
 * GET /api/admin/featured
 * Lista lugares actualmente destacados (ordenados).
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin(request)
    if (session instanceof NextResponse) return session

    await connectDB()

    const places = await Place.find({ featured: true, status: "approved" })
      .select("name neighborhood type photos featuredOrder slug googlePlaceId safetyLevel tags")
      .sort({ featuredOrder: 1, createdAt: -1 })
      .lean()

    return NextResponse.json({
      places: places.map((p, index) => ({
        _id: p._id.toString(),
        name: p.name,
        neighborhood: p.neighborhood,
        type: p.type,
        photos: p.photos ?? [],
        slug: p.slug,
        googlePlaceId: p.googlePlaceId,
        safetyLevel: p.safetyLevel,
        tags: p.tags ?? [],
        featuredOrder: p.featuredOrder ?? index,
      })),
      max: MAX_FEATURED_PLACES,
    })
  } catch (error) {
    logApiError("/api/admin/featured", error, { request })
    return NextResponse.json({ error: "Error al listar destacados" }, { status: 500 })
  }
}

/**
 * PUT /api/admin/featured
 * Reemplaza la selección ordenada de destacados.
 * Body: { placeIds: string[] }
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await requireAdmin(request)
    if (session instanceof NextResponse) return session

    await connectDB()

    const body = await request.json()
    const { placeIds } = putSchema.parse(body)

    const uniqueIds = [...new Set(placeIds)]
    if (uniqueIds.length !== placeIds.length) {
      return NextResponse.json({ error: "Hay IDs duplicados" }, { status: 400 })
    }

    for (const id of uniqueIds) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json({ error: `ID inválido: ${id}` }, { status: 400 })
      }
    }

    if (uniqueIds.length > 0) {
      const approved = await Place.find({
        _id: { $in: uniqueIds },
        status: "approved",
      })
        .select("_id")
        .lean()

      if (approved.length !== uniqueIds.length) {
        return NextResponse.json(
          { error: "Todos los lugares deben existir y estar aprobados" },
          { status: 400 }
        )
      }
    }

    // Quitar destacados anteriores
    await Place.updateMany(
      { featured: true },
      { $set: { featured: false }, $unset: { featuredOrder: 1 } }
    )

    // Aplicar nuevo orden
    await Promise.all(
      uniqueIds.map((id, index) =>
        Place.updateOne(
          { _id: id },
          { $set: { featured: true, featuredOrder: index } }
        )
      )
    )

    invalidateApiCache(["public:places:"])

    const places = await Place.find({ featured: true, status: "approved" })
      .select("name neighborhood type photos featuredOrder slug")
      .sort({ featuredOrder: 1 })
      .lean()

    return NextResponse.json({
      ok: true,
      places: places.map((p, index) => ({
        _id: p._id.toString(),
        name: p.name,
        neighborhood: p.neighborhood,
        type: p.type,
        photos: p.photos ?? [],
        slug: p.slug,
        featuredOrder: p.featuredOrder ?? index,
      })),
      max: MAX_FEATURED_PLACES,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos", details: error.errors }, { status: 400 })
    }
    logApiError("/api/admin/featured", error, { request })
    return NextResponse.json({ error: "Error al guardar destacados" }, { status: 500 })
  }
}
