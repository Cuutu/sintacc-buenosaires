import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import { Review } from "@/models/Review"
import { ContaminationReport } from "@/models/ContaminationReport"
import { requireAdmin } from "@/lib/middleware"
import { placeSchema } from "@/lib/validations"
import { logApiError } from "@/lib/logger"
import mongoose from "mongoose"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()
    
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { error: "ID inválido" },
        { status: 400 }
      )
    }
    
    const place = await Place.findById(params.id).lean()

    if (!place) {
      return NextResponse.json(
        { error: "Lugar no encontrado" },
        { status: 404 }
      )
    }

    const placeObjectId = new mongoose.Types.ObjectId(params.id)

    const [reviewStats, contaminationReportsCount] = await Promise.all([
      Review.aggregate([
        { $match: { placeId: placeObjectId, status: "visible" } },
        {
          $group: {
            _id: null,
            avgRating: { $avg: "$rating" },
            totalReviews: { $sum: 1 },
            safeFeelingCount: { $sum: { $cond: ["$safeFeeling", 1, 0] } },
          },
        },
      ]),
      ContaminationReport.countDocuments({
        placeId: placeObjectId,
        status: "visible",
      }),
    ])

    const stats = reviewStats[0] || {
      avgRating: 0,
      totalReviews: 0,
      safeFeelingCount: 0,
    }

    return NextResponse.json({
      ...place,
      stats: {
        totalReviews: stats.totalReviews,
        avgRating: Math.round((stats.avgRating || 0) * 10) / 10,
        safeFeelingCount: stats.safeFeelingCount,
        contaminationReportsCount,
      },
    })
  } catch (error) {
    logApiError("/api/places/[id]", error, { request })
    return NextResponse.json(
      { error: "Error al obtener lugar" },
      { status: 500 }
    )
  }
}

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
    const validated = placeSchema.partial().parse(body)
    
    const place = await Place.findByIdAndUpdate(
      params.id,
      { ...validated, updatedAt: new Date() },
      { new: true }
    )
    
    if (!place) {
      return NextResponse.json(
        { error: "Lugar no encontrado" },
        { status: 404 }
      )
    }
    
    return NextResponse.json(place)
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.errors },
        { status: 400 }
      )
    }
    logApiError("/api/places/[id]", error, { request })
    return NextResponse.json(
      { error: "Error al actualizar lugar" },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    const place = await Place.findByIdAndDelete(params.id)

    if (!place) {
      return NextResponse.json(
        { error: "Lugar no encontrado" },
        { status: 404 }
      )
    }

    return NextResponse.json({ message: "Lugar eliminado correctamente" })
  } catch (error) {
    logApiError("/api/places/[id]", error, { request })
    return NextResponse.json(
      { error: "Error al eliminar lugar" },
      { status: 500 }
    )
  }
}
