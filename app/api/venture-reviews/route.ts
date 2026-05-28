import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { VentureReview } from "@/models/VentureReview"
import { Venture } from "@/models/Venture"
import { requireAuth } from "@/lib/middleware"
import { ventureReviewSchema, sanitizeHtml } from "@/lib/validations"
import { checkRateLimit } from "@/lib/rate-limit"
import { logApiError } from "@/lib/logger"
import { getSingleVentureReviewStats } from "@/lib/venture-review-stats"
import mongoose from "mongoose"

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50

export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const searchParams = request.nextUrl.searchParams
    const ventureId = searchParams.get("ventureId")
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10))
    )
    const skip = (page - 1) * limit

    if (!ventureId || !mongoose.Types.ObjectId.isValid(ventureId)) {
      return NextResponse.json({ error: "ventureId inválido" }, { status: 400 })
    }

    const ventureObjectId = new mongoose.Types.ObjectId(ventureId)
    const [reviews, total] = await Promise.all([
      VentureReview.find({ ventureId: ventureObjectId, status: "visible" })
        .populate("userId", "name image")
        .sort({ pinned: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      VentureReview.countDocuments({ ventureId: ventureObjectId, status: "visible" }),
    ])

    const stats = await getSingleVentureReviewStats(ventureObjectId)

    return NextResponse.json({
      reviews,
      stats,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (error) {
    logApiError("/api/venture-reviews GET", error, { request })
    return NextResponse.json({ error: "Error al obtener reseñas" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request)
    if (session instanceof NextResponse) return session

    await connectDB()

    const rateLimit = await checkRateLimit(session.user.id, "venture_review", 5)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Límite alcanzado. Podés publicar hasta 5 reseñas de emprendimientos por día.`,
        },
        { status: 429 }
      )
    }

    const body = await request.json()
    const validated = ventureReviewSchema.parse(body)

    if (!mongoose.Types.ObjectId.isValid(validated.ventureId)) {
      return NextResponse.json({ error: "Emprendimiento no encontrado" }, { status: 404 })
    }

    const venture = await Venture.findOne({
      _id: validated.ventureId,
      status: "approved",
    })
    if (!venture) {
      return NextResponse.json({ error: "Emprendimiento no encontrado" }, { status: 404 })
    }

    const ventureObjectId = new mongoose.Types.ObjectId(validated.ventureId)
    const userObjectId = new mongoose.Types.ObjectId(session.user.id)

    const existing = await VentureReview.findOne({
      ventureId: ventureObjectId,
      userId: userObjectId,
      status: "visible",
    })
    if (existing) {
      return NextResponse.json(
        { error: "Ya dejaste una reseña para este emprendimiento" },
        { status: 409 }
      )
    }

    const review = new VentureReview({
      ventureId: ventureObjectId,
      userId: userObjectId,
      rating: validated.rating,
      comment: sanitizeHtml(validated.comment),
      status: "visible",
    })

    await review.save()

    return NextResponse.json(review, { status: 201 })
  } catch (error: unknown) {
    if (error && typeof error === "object" && "name" in error && error.name === "ZodError") {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
    }
    logApiError("/api/venture-reviews POST", error, { request })
    return NextResponse.json({ error: "Error al crear reseña" }, { status: 500 })
  }
}
