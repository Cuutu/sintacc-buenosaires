import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import { requireAdmin } from "@/lib/middleware"
import { logApiError } from "@/lib/logger"
import mongoose from "mongoose"
import { invalidateApiCache } from "@/lib/api-cache"

/** Aprobar o eliminar lugares en masa */
export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAdmin(request)
    if (session instanceof NextResponse) return session

    await connectDB()

    const body = await request.json()
    const { ids, action } = body as { ids: string[]; action: "approve" | "delete" }

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Se requiere un array de IDs" },
        { status: 400 }
      )
    }
    if (action !== "approve" && action !== "delete") {
      return NextResponse.json(
        { error: "Acción inválida. Usar 'approve' o 'delete'" },
        { status: 400 }
      )
    }

    const objectIds = ids
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id))

    if (objectIds.length === 0) {
      return NextResponse.json(
        { error: "Ningún ID válido" },
        { status: 400 }
      )
    }

    if (action === "approve") {
      const result = await Place.updateMany(
        { _id: { $in: objectIds } },
        { $set: { status: "approved", updatedAt: new Date() } }
      )
      invalidateApiCache(["public:places:", "admin:places:", "admin:counts"])
      return NextResponse.json({
        message: `${result.modifiedCount} lugares aprobados`,
        modifiedCount: result.modifiedCount,
      })
    }

    if (action === "delete") {
      const result = await Place.deleteMany({ _id: { $in: objectIds } })
      invalidateApiCache(["public:places:", "admin:places:", "admin:counts"])
      return NextResponse.json({
        message: `${result.deletedCount} lugares eliminados`,
        deletedCount: result.deletedCount,
      })
    }

    return NextResponse.json({ error: "Acción no soportada" }, { status: 400 })
  } catch (error) {
    logApiError("/api/admin/places/bulk", error, { request })
    return NextResponse.json(
      { error: "Error al procesar" },
      { status: 500 }
    )
  }
}
