import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Contact } from "@/models/Contact"
import { requireAdmin } from "@/lib/middleware"
import { logApiError } from "@/lib/logger"
import { estadoQuery, isAdminEstado } from "@/lib/admin-estado"

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin(request)
    if (session instanceof NextResponse) return session

    await connectDB()

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search")?.trim()

    const query: Record<string, unknown> = {}
    const estado = searchParams.get("estado")
    if (estado && !isAdminEstado(estado)) return NextResponse.json({ error: "Estado inválido" }, { status: 400 })
    if (isAdminEstado(estado)) query.$and = [estadoQuery(estado)]
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
    logApiError("/api/admin/contacts", error, { request })
    return NextResponse.json(
      { error: "Error al obtener contactos" },
      { status: 500 }
    )
  }
}
