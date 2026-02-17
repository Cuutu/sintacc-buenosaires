import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Favorite } from "@/models/Favorite"
import { requireAuth } from "@/lib/middleware"
import { logApiError } from "@/lib/logger"
import { features } from "@/lib/features"
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

    const favorites = await Favorite.find({
      userId: new mongoose.Types.ObjectId(session.user.id),
    })
      .populate("placeId")
      .lean()

    return NextResponse.json({ favorites })
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
