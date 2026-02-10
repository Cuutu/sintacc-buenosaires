import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Suggestion } from "@/models/Suggestion"
import { Place } from "@/models/Place"
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
    const { action } = body // "approve" or "reject"
    
    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Acción inválida. Use 'approve' o 'reject'" },
        { status: 400 }
      )
    }
    
    const suggestion = await Suggestion.findById(params.id)
    
    if (!suggestion) {
      return NextResponse.json(
        { error: "Sugerencia no encontrada" },
        { status: 404 }
      )
    }
    
    if (action === "approve") {
      const draft = suggestion.placeDraft as Record<string, unknown>
      const placeData: Record<string, unknown> = { ...draft, status: "approved" }
      if (draft.types && Array.isArray(draft.types) && draft.types.length > 0) {
        if (!draft.type) placeData.type = draft.types[0]
        placeData.types = draft.types
      }
      const place = new Place(placeData)
      await place.save()
      
      suggestion.status = "approved"
      await suggestion.save()
      
      return NextResponse.json({
        message: "Sugerencia aprobada y lugar creado",
        place,
        suggestion,
      })
    } else {
      suggestion.status = "rejected"
      await suggestion.save()
      
      return NextResponse.json({
        message: "Sugerencia rechazada",
        suggestion,
      })
    }
  } catch (error) {
    console.error("Error processing suggestion:", error)
    return NextResponse.json(
      { error: "Error al procesar sugerencia" },
      { status: 500 }
    )
  }
}
