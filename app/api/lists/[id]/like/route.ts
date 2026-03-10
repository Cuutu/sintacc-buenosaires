import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { List } from "@/models/List"
import { ListLike } from "@/models/ListLike"
import { requireAuth } from "@/lib/middleware"
import { checkRateLimit } from "@/lib/rate-limit"
import { logApiError } from "@/lib/logger"
import mongoose from "mongoose"

/** POST: Toggle like en una lista */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth(request)
    if (session instanceof NextResponse) return session

    await connectDB()

    const rateLimit = await checkRateLimit(session.user.id, "list_like", 100)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Límite alcanzado. Podés dar hasta 100 likes por día. Quedan ${rateLimit.remaining} disponibles.`,
        },
        { status: 429 }
      )
    }

    const listId = params.id
    if (!listId || !mongoose.Types.ObjectId.isValid(listId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    const list = await List.findById(listId)
    if (!list) {
      return NextResponse.json({ error: "Lista no encontrada" }, { status: 404 })
    }

    if (!list.isPublic) {
      return NextResponse.json({ error: "Lista no pública" }, { status: 400 })
    }

    const userId = new mongoose.Types.ObjectId(session.user.id)

    const existing = await ListLike.findOne({
      listId: new mongoose.Types.ObjectId(listId),
      userId,
    })

    if (existing) {
      await ListLike.findByIdAndDelete(existing._id)
      const updated = await List.findByIdAndUpdate(
        listId,
        { $inc: { likesCount: -1 } },
        { new: true }
      )
      const likesCount = Math.max(0, updated?.likesCount ?? 0)
      return NextResponse.json({ liked: false, likesCount })
    }

    await ListLike.create({
      listId: new mongoose.Types.ObjectId(listId),
      userId,
    })
    const updated = await List.findByIdAndUpdate(
      listId,
      { $inc: { likesCount: 1 } },
      { new: true }
    )
    return NextResponse.json({
      liked: true,
      likesCount: updated?.likesCount ?? list.likesCount + 1,
    })
  } catch (error: any) {
    if (error.code === 11000) {
      // Duplicate key - race: otro request ya creó el like
      const list = await List.findById(params.id).select("likesCount").lean()
      return NextResponse.json({
        liked: true,
        likesCount: list?.likesCount ?? 0,
      })
    }
    logApiError("/api/lists/[id]/like POST", error, { request })
    return NextResponse.json(
      { error: "Error al dar like" },
      { status: 500 }
    )
  }
}
