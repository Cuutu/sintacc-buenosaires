import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Contact } from "@/models/Contact"
import { requireAdmin } from "@/lib/middleware"

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin(request)
    if (session instanceof NextResponse) return session

    await connectDB()

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search")?.trim()

    const query: Record<string, unknown> = {}
    if (search && search.length >= 2) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
      query.$or = [
        { name: regex },
        { email: regex },
        { subject: regex },
        { message: regex },
      ]
    }

    const contacts = await Contact.find(query)
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
