import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { List } from "@/models/List"
import { requireAuth } from "@/lib/middleware"
import { logApiError } from "@/lib/logger"
import mongoose from "mongoose"

/** GET: ?mine=1 = mis listas (auth), sin params = top públicas */
export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const wantMine = request.nextUrl.searchParams.get("mine") === "1"

    if (wantMine) {
      const session = await requireAuth(request)
      if (session instanceof NextResponse) return session

      const myLists = await List.find({
        createdBy: new mongoose.Types.ObjectId(session.user.id),
      })
        .sort({ updatedAt: -1 })
        .populate("placeIds", "name neighborhood photos type")
        .populate("createdBy", "name image")
        .lean()

      return NextResponse.json({ lists: myLists }, {
        headers: { "Cache-Control": "no-store, max-age=0" },
      })
    }

    // Top listas públicas (sin auth)
    const top = await List.find({ isPublic: true })
      .sort({ likesCount: -1, createdAt: -1 })
      .limit(12)
      .populate("createdBy", "name image")
      .populate({
        path: "placeIds",
        select: "name neighborhood photos type",
        options: { limit: 3 },
      })
      .lean()

    return NextResponse.json({ lists: top }, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    })
  } catch (error) {
    logApiError("/api/lists GET", error, { request })
    return NextResponse.json(
      { error: "Error al obtener listas" },
      { status: 500 }
    )
  }
}

/** POST: Crear lista (auth requerido) */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request)
    if (session instanceof NextResponse) return session

    await connectDB()

    const body = await request.json()
    const { name, description, placeIds } = body

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "El nombre es obligatorio" },
        { status: 400 }
      )
    }

    const validPlaceIds = Array.isArray(placeIds)
      ? placeIds
          .filter((id: string) => mongoose.Types.ObjectId.isValid(id))
          .map((id: string) => new mongoose.Types.ObjectId(id))
      : []

    const list = new List({
      name: name.trim().slice(0, 80),
      description: typeof description === "string" ? description.trim().slice(0, 300) : undefined,
      placeIds: validPlaceIds,
      createdBy: new mongoose.Types.ObjectId(session.user.id),
      isPublic: true,
    })

    await list.save()
    await list.populate("placeIds", "name neighborhood photos type")
    await list.populate("createdBy", "name image")

    return NextResponse.json(list, { status: 201 })
  } catch (error) {
    logApiError("/api/lists POST", error, { request })
    return NextResponse.json(
      { error: "Error al crear lista" },
      { status: 500 }
    )
  }
}
