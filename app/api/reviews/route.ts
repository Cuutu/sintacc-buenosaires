import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Review } from "@/models/Review"
import { Place } from "@/models/Place"
import { requireAuth } from "@/lib/middleware"
import { reviewSchema } from "@/lib/validations"
import { checkRateLimit } from "@/lib/rate-limit"
import { sanitizeHtml } from "@/lib/validations"
import mongoose from "mongoose"

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const searchParams = request.nextUrl.searchParams
    const placeId = searchParams.get("placeId")
    
    if (!placeId || !mongoose.Types.ObjectId.isValid(placeId)) {
      return NextResponse.json(
        { error: "placeId inválido" },
        { status: 400 }
      )
    }
    
    const reviews = await Review.find({
      placeId: new mongoose.Types.ObjectId(placeId),
      status: "visible",
    })
      .populate("userId", "name image")
      .sort({ pinned: -1, createdAt: -1 })
      .lean()
    
    return NextResponse.json({ reviews })
  } catch (error) {
    console.error("Error fetching reviews:", error)
    return NextResponse.json(
      { error: "Error al obtener reseñas" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request)
    if (session instanceof NextResponse) return session
    
    await connectDB()
    
    // Rate limiting: max 3 reviews per day
    const rateLimit = await checkRateLimit(
      session.user.id,
      "review",
      3
    )
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Límite alcanzado. Has creado 3 reseñas hoy. Quedan ${rateLimit.remaining} disponibles.` },
        { status: 429 }
      )
    }
    
    const body = await request.json()
    const validated = reviewSchema.parse(body)
    
    // Verify place exists
    const place = await Place.findById(validated.placeId)
    if (!place) {
      return NextResponse.json(
        { error: "Lugar no encontrado" },
        { status: 404 }
      )
    }
    
    // Sanitize comment
    const sanitizedComment = sanitizeHtml(validated.comment)
    
    const review = new Review({
      placeId: new mongoose.Types.ObjectId(validated.placeId),
      userId: new mongoose.Types.ObjectId(session.user.id),
      rating: validated.rating,
      safeFeeling: validated.safeFeeling,
      separateKitchen: validated.separateKitchen,
      comment: sanitizedComment,
      status: "visible",
      // Fase 2 fields
      contaminationIncident: validated.contaminationIncident,
      visitDate: validated.visitDate ? new Date(validated.visitDate) : undefined,
      evidencePhotos: validated.evidencePhotos,
    })
    
    await review.save()
    
    // Update place lastConfirmedAt if safeFeeling is true (Fase 2)
    if (validated.safeFeeling) {
      await Place.findByIdAndUpdate(validated.placeId, {
        lastConfirmedAt: new Date(),
      })
    }
    
    return NextResponse.json(review, { status: 201 })
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error creating review:", error)
    return NextResponse.json(
      { error: "Error al crear reseña" },
      { status: 500 }
    )
  }
}
