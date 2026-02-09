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
    const { action } = body // "hide" or "unhide"
    
    if (!["hide", "unhide"].includes(action)) {
      return NextResponse.json(
        { error: "Acción inválida. Use 'hide' o 'unhide'" },
        { status: 400 }
      )
    }
    
    const review = await Review.findByIdAndUpdate(
      params.id,
      { status: action === "hide" ? "hidden" : "visible" },
      { new: true }
    )
    
    if (!review) {
      return NextResponse.json(
        { error: "Reseña no encontrada" },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      message: `Reseña ${action === "hide" ? "ocultada" : "mostrada"}`,
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
