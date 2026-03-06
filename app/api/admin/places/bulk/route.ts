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
    const { ids, action, safetyLevel } = body as {
      ids: string[]
      action: "approve" | "delete" | "set_safety_level" | "clear_safety_level"
      safetyLevel?: "dedicated_gf" | "gf_options"
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Se requiere un array de IDs" },
        { status: 400 }
      )
    }
    if (
      action !== "approve" &&
      action !== "delete" &&
      action !== "set_safety_level" &&
      action !== "clear_safety_level"
    ) {
      return NextResponse.json(
        { error: "Acción inválida." },
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

    if (action === "set_safety_level") {
      if (safetyLevel !== "dedicated_gf" && safetyLevel !== "gf_options") {
        return NextResponse.json(
          { error: "safetyLevel inválido. Usar 'dedicated_gf' o 'gf_options'" },
          { status: 400 }
        )
      }

      const addTag = safetyLevel === "dedicated_gf" ? "100_gf" : "opciones_sin_tacc"
      const removeTags =
        safetyLevel === "dedicated_gf"
          ? ["opciones_sin_tacc"]
          : ["100_gf", "certificado_sin_tacc"]

      const result = await Place.updateMany(
        { _id: { $in: objectIds } },
        {
          $set: { safetyLevel, updatedAt: new Date() },
          $addToSet: { tags: addTag },
          $pull: { tags: { $in: removeTags } },
        }
      )

      invalidateApiCache(["public:places:", "admin:places:", "admin:counts"])
      return NextResponse.json({
        message: `${result.modifiedCount} lugares actualizados`,
        modifiedCount: result.modifiedCount,
      })
    }

    if (action === "clear_safety_level") {
      const result = await Place.updateMany(
        { _id: { $in: objectIds } },
        {
          $unset: { safetyLevel: 1 },
          $pull: { tags: { $in: ["100_gf", "opciones_sin_tacc"] } },
          $set: { updatedAt: new Date() },
        }
      )
      invalidateApiCache(["public:places:", "admin:places:", "admin:counts"])
      return NextResponse.json({
        message: `${result.modifiedCount} lugares sin badge`,
        modifiedCount: result.modifiedCount,
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
