import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Venture } from "@/models/Venture"
import { logApiError } from "@/lib/logger"
import { getSingleVentureReviewStats } from "@/lib/venture-review-stats"
import mongoose from "mongoose"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const idOrSlug = params?.id
  try {
    if (!idOrSlug?.trim()) {
      return NextResponse.json({ error: "Parámetro inválido" }, { status: 400 })
    }

    await connectDB()

    let venture = null
    let ventureOid: mongoose.Types.ObjectId | null = null

    if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
      ventureOid = new mongoose.Types.ObjectId(idOrSlug)
      venture = await Venture.findOne({
        _id: ventureOid,
        status: "approved",
      }).lean()
    } else {
      venture = await Venture.findOne({
        slug: idOrSlug,
        status: "approved",
      }).lean()
      if (venture) ventureOid = venture._id as mongoose.Types.ObjectId
    }

    if (!venture || !ventureOid) {
      return NextResponse.json({ error: "Emprendimiento no encontrado" }, { status: 404 })
    }

    const stats = await getSingleVentureReviewStats(ventureOid)

    return NextResponse.json({
      venture: {
        ...venture,
        slug: venture.slug ?? venture._id.toString(),
        stats,
      },
    })
  } catch (error) {
    logApiError("/api/ventures/[id]", error, { request })
    return NextResponse.json({ error: "Error al obtener emprendimiento" }, { status: 500 })
  }
}
