import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { ContaminationReport } from "@/models/ContaminationReport"
import { Place } from "@/models/Place"
import { requireAuth } from "@/lib/middleware"
import { contaminationReportSchema } from "@/lib/validations"
import { checkRateLimit } from "@/lib/rate-limit"
import { sanitizeHtml } from "@/lib/validations"
import mongoose from "mongoose"

export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const placeId = request.nextUrl.searchParams.get("placeId")

    if (!placeId || !mongoose.Types.ObjectId.isValid(placeId)) {
      return NextResponse.json(
        { error: "placeId inválido" },
        { status: 400 }
      )
    }

    const reports = await ContaminationReport.find({
      placeId: new mongoose.Types.ObjectId(placeId),
      status: "visible",
    })
      .populate("userId", "name")
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json({ reports })
  } catch (error) {
    console.error("Error fetching contamination reports:", error)
    return NextResponse.json(
      { error: "Error al obtener reportes" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request)
    if (session instanceof NextResponse) return session

    await connectDB()

    const rateLimit = await checkRateLimit(
      session.user.id,
      "contamination_report",
      5
    )

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Límite alcanzado. Podés reportar hasta 5 lugares por día. Quedan ${rateLimit.remaining} disponibles.`,
        },
        { status: 429 }
      )
    }

    const body = await request.json()
    const validated = contaminationReportSchema.parse(body)

    const place = await Place.findById(validated.placeId)
    if (!place) {
      return NextResponse.json(
        { error: "Lugar no encontrado" },
        { status: 404 }
      )
    }

    const sanitizedComment = sanitizeHtml(validated.comment)

    const report = new ContaminationReport({
      placeId: new mongoose.Types.ObjectId(validated.placeId),
      userId: new mongoose.Types.ObjectId(session.user.id),
      comment: sanitizedComment,
      status: "visible",
    })

    await report.save()

    return NextResponse.json(report, { status: 201 })
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error creating contamination report:", error)
    return NextResponse.json(
      { error: "Error al crear reporte" },
      { status: 500 }
    )
  }
}
