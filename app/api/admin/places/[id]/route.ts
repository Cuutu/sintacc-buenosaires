import { NextRequest, NextResponse } from "next/server"
import mongoose from "mongoose"
import { requireAdmin } from "@/lib/middleware"
import { logApiError } from "@/lib/logger"
import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin(request)
    if (session instanceof NextResponse) return session

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    await connectDB()
    const place = await Place.findById(params.id).lean()
    if (!place) {
      return NextResponse.json({ error: "Lugar no encontrado" }, { status: 404 })
    }
    return NextResponse.json(place)
  } catch (error) {
    logApiError("/api/admin/places/[id]", error, { request })
    return NextResponse.json({ error: "Error al obtener lugar" }, { status: 500 })
  }
}
