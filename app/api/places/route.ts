import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import { requireAdmin } from "@/lib/middleware"
import { placeSchema } from "@/lib/validations"
import mongoose from "mongoose"

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search")
    const type = searchParams.get("type")
    const neighborhood = searchParams.get("neighborhood")
    const tags = searchParams.get("tags")?.split(",").filter(Boolean)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const skip = (page - 1) * limit
    
    const query: any = { status: "approved" }
    
    if (search) {
      query.$text = { $search: search }
    }
    
    if (type) {
      query.type = type
    }
    
    if (neighborhood) {
      query.neighborhood = neighborhood
    }
    
    if (tags && tags.length > 0) {
      query.tags = { $in: tags }
    }
    
    const places = await Place.find(query)
      .sort(search ? { score: { $meta: "textScore" } } : { createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
    
    const total = await Place.countDocuments(query)
    
    return NextResponse.json({
      places,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching places:", error)
    return NextResponse.json(
      { error: "Error al obtener lugares" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin(request)
    if (session instanceof NextResponse) return session
    
    await connectDB()
    
    const body = await request.json()
    const validated = placeSchema.parse(body)
    
    const place = new Place({
      ...validated,
      status: "approved",
    })
    
    await place.save()
    
    return NextResponse.json(place, { status: 201 })
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error creating place:", error)
    return NextResponse.json(
      { error: "Error al crear lugar" },
      { status: 500 }
    )
  }
}
