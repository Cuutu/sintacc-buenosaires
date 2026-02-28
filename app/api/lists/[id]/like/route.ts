import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { List } from "@/models/List"
import { ListLike } from "@/models/ListLike"
import { requireAuth } from "@/lib/middleware"
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
      list.likesCount = Math.max(0, list.likesCount - 1)
      await list.save()
      return NextResponse.json({ liked: false, likesCount: list.likesCount })
    }

    await ListLike.create({
      listId: new mongoose.Types.ObjectId(listId),
      userId,
    })
    list.likesCount += 1
    await list.save()

    return NextResponse.json({ liked: true, likesCount: list.likesCount })
  } catch (error: any) {
    if (error.code === 11000) {
      // Duplicate - ya likeó
      const list = await List.findById(params.id)
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
