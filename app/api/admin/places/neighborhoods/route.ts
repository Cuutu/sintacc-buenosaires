import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import { requireAdmin } from "@/lib/middleware"
import { logApiError } from "@/lib/logger"

/** Barrios/localidades distintos de la DB para el filtro del admin */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin(request)
    if (session instanceof NextResponse) return session

    await connectDB()

    const neighborhoods = await Place.distinct("neighborhood").then((arr) =>
      arr.filter(Boolean).sort((a, b) => String(a).localeCompare(String(b)))
    )

    return NextResponse.json({ neighborhoods })
  } catch (error) {
    logApiError("/api/admin/places/neighborhoods", error, { request })
    return NextResponse.json(
      { error: "Error al obtener localidades" },
      { status: 500 }
    )
  }
}
