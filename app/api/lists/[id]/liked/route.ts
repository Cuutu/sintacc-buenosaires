import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { ListLike } from "@/models/ListLike"
import { requireAuth } from "@/lib/middleware"
import { logApiError } from "@/lib/logger"
import mongoose from "mongoose"

/** GET: Verificar si el usuario actual dio like a la lista */
export async function GET(
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

    const liked = await ListLike.exists({
      listId: new mongoose.Types.ObjectId(listId),
      userId: new mongoose.Types.ObjectId(session.user.id),
    })

    return NextResponse.json({ liked: !!liked })
  } catch (error) {
    logApiError("/api/lists/[id]/liked GET", error, { request })
    return NextResponse.json(
      { error: "Error al verificar like" },
      { status: 500 }
    )
  }
}
