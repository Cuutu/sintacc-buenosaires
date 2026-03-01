import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { List } from "@/models/List"
import { ListLike } from "@/models/ListLike"
import { requireAuth } from "@/lib/middleware"
import { logApiError } from "@/lib/logger"
import mongoose from "mongoose"

/** GET: Obtener una lista por ID (pública) */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()

    const id = params.id
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    const list = await List.findOne({
      _id: new mongoose.Types.ObjectId(id),
      isPublic: true,
    })
      .populate("createdBy", "name image")
      .populate("placeIds")
      .lean()

    if (!list) {
      return NextResponse.json({ error: "Lista no encontrada" }, { status: 404 })
    }

    return NextResponse.json(list)
  } catch (error) {
    logApiError("/api/lists/[id] GET", error, { request })
    return NextResponse.json(
      { error: "Error al obtener lista" },
      { status: 500 }
    )
  }
}

/** PATCH: Actualizar lista (solo owner) */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth(request)
    if (session instanceof NextResponse) return session

    await connectDB()

    const id = params.id
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    const list = await List.findById(id)
    if (!list) {
      return NextResponse.json({ error: "Lista no encontrada" }, { status: 404 })
    }

    if (list.createdBy.toString() !== session.user.id) {
      return NextResponse.json({ error: "No tenés permiso" }, { status: 403 })
    }

    const body = await request.json()
    if (body.name !== undefined) {
      list.name =
        typeof body.name === "string" ? body.name.trim().slice(0, 80) : list.name
    }
    if (body.description !== undefined) {
      list.description =
        typeof body.description === "string"
          ? body.description.trim().slice(0, 300)
          : body.description
    }
    if (Array.isArray(body.placeIds)) {
      list.placeIds = body.placeIds
        .filter((pid: string) => mongoose.Types.ObjectId.isValid(pid))
        .map((pid: string) => new mongoose.Types.ObjectId(pid))
    }

    await list.save()
    await list.populate("placeIds", "name neighborhood photos type")
    await list.populate("createdBy", "name image")

    return NextResponse.json(list)
  } catch (error) {
    logApiError("/api/lists/[id] PATCH", error, { request })
    return NextResponse.json(
      { error: "Error al actualizar lista" },
      { status: 500 }
    )
  }
}

/** DELETE: Eliminar lista (solo owner) */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth(request)
    if (session instanceof NextResponse) return session

    await connectDB()

    const id = params.id
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    const list = await List.findById(id)
    if (!list) {
      return NextResponse.json({ error: "Lista no encontrada" }, { status: 404 })
    }

    if (list.createdBy.toString() !== session.user.id) {
      return NextResponse.json({ error: "No tenés permiso" }, { status: 403 })
    }

    await Promise.all([
      List.findByIdAndDelete(id),
      ListLike.deleteMany({ listId: new mongoose.Types.ObjectId(id) }),
    ])

    return NextResponse.json({ message: "Lista eliminada" })
  } catch (error) {
    logApiError("/api/lists/[id] DELETE", error, { request })
    return NextResponse.json(
      { error: "Error al eliminar lista" },
      { status: 500 }
    )
  }
}
