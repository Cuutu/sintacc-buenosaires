import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import { Review } from "@/models/Review"
import { requireAdmin } from "@/lib/middleware"
import { placeSchema } from "@/lib/validations"
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
    
    // Get reviews stats
    const reviews = await Review.find({
      placeId: new mongoose.Types.ObjectId(params.id),
      status: "visible",
    }).lean()
    
    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0
    
    const safeFeelingCount = reviews.filter((r) => r.safeFeeling).length
    
    return NextResponse.json({
      ...place,
      stats: {
        totalReviews: reviews.length,
        avgRating: Math.round(avgRating * 10) / 10,
        safeFeelingCount,
      },
    })
  } catch (error) {
    console.error("Error fetching place:", error)
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
    console.error("Error updating place:", error)
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
    console.error("Error deleting place:", error)
    return NextResponse.json(
      { error: "Error al eliminar lugar" },
      { status: 500 }
    )
  }
}
