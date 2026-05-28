import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { VentureReview } from "@/models/VentureReview"
import { requireAdmin } from "@/lib/middleware"
import { logApiError } from "@/lib/logger"
import mongoose from "mongoose"

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
    const { action } = body

    if (!["hide", "unhide", "pin", "unpin"].includes(action)) {
      return NextResponse.json({ error: "Acción inválida" }, { status: 400 })
    }

    let update: Record<string, unknown>
    let message: string

    if (action === "pin" || action === "unpin") {
      update = { pinned: action === "pin" }
      message = action === "pin" ? "Reseña fijada" : "Reseña desfijada"
    } else {
      update = { status: action === "hide" ? "hidden" : "visible" }
      message = action === "hide" ? "Reseña ocultada" : "Reseña mostrada"
    }

    const review = await VentureReview.findByIdAndUpdate(params.id, update, { new: true })
    if (!review) {
      return NextResponse.json({ error: "Reseña no encontrada" }, { status: 404 })
    }

    return NextResponse.json({ message, review })
  } catch (error) {
    logApiError("/api/admin/venture-reviews/[id]", error, { request })
    return NextResponse.json({ error: "Error al procesar reseña" }, { status: 500 })
  }
}
