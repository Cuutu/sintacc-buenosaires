import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Review } from "@/models/Review"
import { requireAdmin } from "@/lib/middleware"
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
      return NextResponse.json(
        { error: "ID inválido" },
        { status: 400 }
      )
    }
    
    const body = await request.json()
    const { action } = body // "hide" | "unhide" | "pin" | "unpin"
    
    if (!["hide", "unhide", "pin", "unpin"].includes(action)) {
      return NextResponse.json(
        { error: "Acción inválida. Use 'hide', 'unhide', 'pin' o 'unpin'" },
        { status: 400 }
      )
    }
    
    let update: Record<string, unknown>
    let message: string
    
    if (action === "pin" || action === "unpin") {
      update = { pinned: action === "pin" }
      message = action === "pin" ? "Comentario fijado" : "Comentario desfijado"
    } else {
      update = { status: action === "hide" ? "hidden" : "visible" }
      message = action === "hide" ? "Reseña ocultada" : "Reseña mostrada"
    }
    
    const review = await Review.findByIdAndUpdate(
      params.id,
      update,
      { new: true }
    )
    
    if (!review) {
      return NextResponse.json(
        { error: "Reseña no encontrada" },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      message,
      review,
    })
  } catch (error) {
    console.error("Error updating review:", error)
    return NextResponse.json(
      { error: "Error al actualizar reseña" },
      { status: 500 }
    )
  }
}
