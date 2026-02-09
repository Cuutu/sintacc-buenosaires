import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Suggestion } from "@/models/Suggestion"
import { requireAuth } from "@/lib/middleware"
import { suggestionSchema } from "@/lib/validations"
import mongoose from "mongoose"

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request)
    if (session instanceof NextResponse) return session
    
    await connectDB()
    
    const body = await request.json()
    const validated = suggestionSchema.parse(body)
    
    const suggestion = new Suggestion({
      placeDraft: {
        ...validated,
        status: "pending",
      },
      suggestedByUserId: new mongoose.Types.ObjectId(session.user.id),
      status: "pending",
    })
    
    await suggestion.save()
    
    return NextResponse.json(suggestion, { status: 201 })
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error creating suggestion:", error)
    return NextResponse.json(
      { error: "Error al crear sugerencia" },
      { status: 500 }
    )
  }
}
