import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Contact } from "@/models/Contact"
import { requireAuth } from "@/lib/middleware"
import mongoose from "mongoose"
import { z } from "zod"

const contactSchema = z.object({
  subject: z.string().min(1, "El asunto es requerido").max(200),
  message: z.string().min(1, "El mensaje es requerido").max(2000),
})

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request)
    if (session instanceof NextResponse) return session

    await connectDB()

    const body = await request.json()
    const validated = contactSchema.parse(body)

    const contact = new Contact({
      userId: new mongoose.Types.ObjectId(session.user.id),
      name: session.user.name ?? "",
      email: session.user.email ?? "",
      subject: validated.subject,
      message: validated.message,
    })

    await contact.save()

    return NextResponse.json(
      { message: "Mensaje enviado correctamente" },
      { status: 201 }
    )
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error creating contact:", error)
    return NextResponse.json(
      { error: "Error al enviar mensaje" },
      { status: 500 }
    )
  }
}
