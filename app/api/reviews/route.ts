import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Review } from "@/models/Review"
import { Place } from "@/models/Place"
import { requireAuth } from "@/lib/middleware"
import { reviewSchema } from "@/lib/validations"
import { checkRateLimit } from "@/lib/rate-limit"
import { sanitizeHtml } from "@/lib/validations"
import { logApiError } from "@/lib/logger"
import { getClientIp } from "@/lib/rate-limit"
import mongoose from "mongoose"

const REVIEWS_DEFAULT_LIMIT = 20
const REVIEWS_MAX_LIMIT = 50

export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const searchParams = request.nextUrl.searchParams
    const placeId = searchParams.get("placeId")
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.min(
      REVIEWS_MAX_LIMIT,
      Math.max(1, parseInt(searchParams.get("limit") || String(REVIEWS_DEFAULT_LIMIT), 10))
    )
    const skip = (page - 1) * limit

    if (!placeId || !mongoose.Types.ObjectId.isValid(placeId)) {
      return NextResponse.json(
        { error: "placeId inválido" },
        { status: 400 }
      )
    }

    const placeObjectId = new mongoose.Types.ObjectId(placeId)
    const [reviews, total] = await Promise.all([
      Review.find({
        placeId: placeObjectId,
        status: "visible",
      })
        .populate("userId", "name image")
        .sort({ pinned: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments({ placeId: placeObjectId, status: "visible" }),
    ])

    return NextResponse.json({
      reviews,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    logApiError("/api/reviews", error, { request })
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
    logApiError("/api/reviews", error, { request })
    return NextResponse.json(
      { error: "Error al crear reseña" },
      { status: 500 }
    )
  }
}
