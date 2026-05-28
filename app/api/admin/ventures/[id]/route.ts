import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Venture } from "@/models/Venture"
import { requireAdmin } from "@/lib/middleware"
import { ventureSchema } from "@/lib/validations"
import { logApiError } from "@/lib/logger"
import mongoose from "mongoose"
import { ZodError } from "zod"
import { invalidateApiCache } from "@/lib/api-cache"

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin(request)
    if (session instanceof NextResponse) return session

    await connectDB()

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    const body = await request.json()
    const parsed = ventureSchema.partial().parse(body)

    const venture = await Venture.findByIdAndUpdate(
      params.id,
      { $set: parsed },
      { new: true, runValidators: true }
    ).lean()

    if (!venture) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    }

    invalidateApiCache(["public:ventures:", "admin:ventures:", "admin:counts"])
    return NextResponse.json({ venture })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Datos inválidos", details: error.errors }, { status: 400 })
    }
    logApiError("/api/admin/ventures/[id] PATCH", error, { request })
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin(request)
    if (session instanceof NextResponse) return session

    await connectDB()

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    const result = await Venture.findByIdAndDelete(params.id)
    if (!result) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    }

    invalidateApiCache(["public:ventures:", "admin:ventures:", "admin:counts"])
    return NextResponse.json({ message: "Eliminado" })
  } catch (error) {
    logApiError("/api/admin/ventures/[id] DELETE", error, { request })
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 })
  }
}
