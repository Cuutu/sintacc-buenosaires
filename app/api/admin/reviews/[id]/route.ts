import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Review } from "@/models/Review"
import { requireAdmin } from "@/lib/middleware"
import { sanitizeHtml } from "@/lib/validations"
import { ADMIN_REPLY_DISPLAY_NAME } from "@/lib/constants"
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
      return NextResponse.json(
        { error: "ID inválido" },
        { status: 400 }
      )
    }
    
    const body = await request.json()
    const { action } = body

    if (!["hide", "unhide", "pin", "unpin", "reply", "delete_reply"].includes(action)) {
      return NextResponse.json(
        { error: "Acción inválida" },
        { status: 400 }
      )
    }

    let update: Record<string, unknown> | mongoose.UpdateQuery<typeof Review>
    let message: string

    if (action === "reply") {
      const reply = typeof body.reply === "string" ? body.reply.trim() : ""
      if (reply.length < 1 || reply.length > 800) {
        return NextResponse.json(
          { error: "La respuesta debe tener entre 1 y 800 caracteres" },
          { status: 400 }
        )
      }
      update = {
        adminReply: sanitizeHtml(reply),
        adminReplyAt: new Date(),
        adminReplyBy: ADMIN_REPLY_DISPLAY_NAME,
      }
      message = "Respuesta publicada"
    } else if (action === "delete_reply") {
      update = {
        $unset: { adminReply: "", adminReplyAt: "", adminReplyBy: "" },
      }
      message = "Respuesta eliminada"
    } else if (action === "pin" || action === "unpin") {
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
    logApiError("/api/admin/reviews/[id]", error, { request })
    return NextResponse.json(
      { error: "Error al actualizar reseña" },
      { status: 500 }
    )
  }
}
