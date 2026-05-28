import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Venture } from "@/models/Venture"
import { logApiError } from "@/lib/logger"
import mongoose from "mongoose"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params?.id
  try {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    await connectDB()

    const venture = await Venture.findOne({
      _id: new mongoose.Types.ObjectId(id),
      status: "approved",
    }).lean()

    if (!venture) {
      return NextResponse.json({ error: "Emprendimiento no encontrado" }, { status: 404 })
    }

    return NextResponse.json({ venture })
  } catch (error) {
    logApiError("/api/ventures/[id]", error, { request })
    return NextResponse.json({ error: "Error al obtener emprendimiento" }, { status: 500 })
  }
}
