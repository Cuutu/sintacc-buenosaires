import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Favorite } from "@/models/Favorite"
import "@/models/Place"
import { requireAuth } from "@/lib/middleware"
import { logApiError } from "@/lib/logger"
import { features } from "@/lib/features"
import { getReviewStatsFor } from "@/lib/review-stats-index"
import mongoose from "mongoose"

export async function GET(request: NextRequest) {
  if (!features.favorites) {
    return NextResponse.json(
      { error: "Feature no disponible en esta fase" },
      { status: 403 }
    )
  }

  try {
    const session = await requireAuth(request)
    if (session instanceof NextResponse) return session

    await connectDB()

    const userId = new mongoose.Types.ObjectId(session.user.id)
    const idsOnly = request.nextUrl.searchParams.get("ids") === "1"

    if (idsOnly) {
      const rows = await Favorite.find({ userId }).select("placeId").lean()
      return NextResponse.json(
        { placeIds: rows.map((row) => String(row.placeId)) },
        { headers: { "Cache-Control": "private, max-age=15" } }
      )
    }

    const favorites = await Favorite.find({
      userId,
    })
      .populate(
        "placeId",
        "name types type neighborhood slug location tags safetyLevel photos openingHours googleSnapshot.rating googleSnapshot.userRatingCount status"
      )
      .lean()

    // Puntaje de CeliMap para las tarjetas (el índice está en caché: no es otra consulta por lugar).
    const placeIds = favorites
      .map((f) => f.placeId as unknown as { _id?: { toString(): string } } | null)
      .filter((p): p is { _id: { toString(): string } } => Boolean(p?._id))
      .map((p) => p._id)
    const stats = await getReviewStatsFor(placeIds)
    const withStats = favorites.map((f) => {
      const place = f.placeId as unknown as ({ _id?: { toString(): string } } & Record<string, unknown>) | null
      return place?._id ? { ...f, placeId: { ...place, stats: stats.get(place._id.toString()) } } : f
    })

    return NextResponse.json(
      { favorites: withStats },
      { headers: { "Cache-Control": "private, max-age=15" } }
    )
  } catch (error) {
    logApiError("/api/favorites", error, { request })
    return NextResponse.json(
      { error: "Error al obtener favoritos" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  if (!features.favorites) {
    return NextResponse.json(
      { error: "Feature no disponible en esta fase" },
      { status: 403 }
    )
  }

  try {
    const session = await requireAuth(request)
    if (session instanceof NextResponse) return session

    await connectDB()

    const body = await request.json()
    const { placeId } = body

    if (!placeId || !mongoose.Types.ObjectId.isValid(placeId)) {
      return NextResponse.json(
        { error: "placeId inválido" },
        { status: 400 }
      )
    }

    const favorite = new Favorite({
      userId: new mongoose.Types.ObjectId(session.user.id),
      placeId: new mongoose.Types.ObjectId(placeId),
    })

    await favorite.save()

    return NextResponse.json(favorite, { status: 201 })
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json(
        { error: "Ya está en favoritos" },
        { status: 400 }
      )
    }
    logApiError("/api/favorites", error, { request })
    return NextResponse.json(
      { error: "Error al agregar a favoritos" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  if (!features.favorites) {
    return NextResponse.json(
      { error: "Feature no disponible en esta fase" },
      { status: 403 }
    )
  }

  try {
    const session = await requireAuth(request)
    if (session instanceof NextResponse) return session

    await connectDB()

    const searchParams = request.nextUrl.searchParams
    const placeId = searchParams.get("placeId")

    if (!placeId || !mongoose.Types.ObjectId.isValid(placeId)) {
      return NextResponse.json(
        { error: "placeId inválido" },
        { status: 400 }
      )
    }

    await Favorite.findOneAndDelete({
      userId: new mongoose.Types.ObjectId(session.user.id),
      placeId: new mongoose.Types.ObjectId(placeId),
    })

    return NextResponse.json({ message: "Eliminado de favoritos" })
  } catch (error) {
    logApiError("/api/favorites", error, { request })
    return NextResponse.json(
      { error: "Error al eliminar de favoritos" },
      { status: 500 }
    )
  }
}
