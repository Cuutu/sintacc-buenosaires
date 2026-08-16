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

    const [neighborhoods, provinces, localities] = await Promise.all([
      Place.distinct("neighborhood").then((arr) =>
        arr.filter(Boolean).sort((a, b) => String(a).localeCompare(String(b), "es"))
      ),
      Place.distinct("province").then((arr) =>
        arr.filter(Boolean).sort((a, b) => String(a).localeCompare(String(b), "es"))
      ),
      Place.distinct("locality").then((arr) =>
        arr.filter(Boolean).sort((a, b) => String(a).localeCompare(String(b), "es"))
      ),
    ])

    return NextResponse.json({ neighborhoods, provinces, localities })
  } catch (error) {
    logApiError("/api/admin/places/neighborhoods", error, { request })
    return NextResponse.json(
      { error: "Error al obtener localidades" },
      { status: 500 }
    )
  }
}
