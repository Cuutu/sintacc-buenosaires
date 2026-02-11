import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Contact } from "@/models/Contact"
import { requireAdmin } from "@/lib/middleware"

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin(request)
    if (session instanceof NextResponse) return session

    await connectDB()

    const contacts = await Contact.find()
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json({ contacts })
  } catch (error) {
    console.error("Error fetching contacts:", error)
    return NextResponse.json(
      { error: "Error al obtener contactos" },
      { status: 500 }
    )
  }
}
