import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { List } from "@/models/List"
import "@/models/Place"
import "@/models/User"
import { requireAuth } from "@/lib/middleware"
import { checkRateLimit } from "@/lib/rate-limit"
import { logApiError } from "@/lib/logger"
import mongoose from "mongoose"
import { LIST_VISIBILITY } from "@/lib/lists/constants"
import { canUsePrivateLists, publicListsQuery } from "@/lib/lists/access"
import {
  applyVisibilityFields,
  normalizeCoverImage,
  normalizeDestination,
  normalizePlaceIdStrings,
  normalizePlaceNotes,
  parseVisibility,
} from "@/lib/lists/normalize"
import {
  serializeListForCommunity,
  serializeListForOwner,
} from "@/lib/lists/serialize"

function toObjectIds(ids: string[]) {
  return ids.map((id) => new mongoose.Types.ObjectId(id))
}

/** GET: ?mine=1 = mis listas (auth), sin params = top públicas */
export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const wantMine = request.nextUrl.searchParams.get("mine") === "1"

    if (wantMine) {
      const session = await requireAuth(request)
      if (session instanceof NextResponse) return session

      const myLists = await List.find({
        createdBy: new mongoose.Types.ObjectId(session.user.id),
      })
        .select("+privateAccessToken")
        .sort({ updatedAt: -1 })
        .populate("placeIds", "name neighborhood photos type slug")
        .populate("createdBy", "name image")
        .lean()

      return NextResponse.json(
        {
          lists: myLists.map((list) => serializeListForOwner(list as never)),
          canUsePrivateLists: canUsePrivateLists({
            email: session.user.email,
            role: session.user.role,
          }),
        },
        {
          headers: { "Cache-Control": "no-store, max-age=0" },
        }
      )
    }

    // Top listas públicas (sin auth). ?limit= con cap 20
    const limitParam = request.nextUrl.searchParams.get("limit")
    const limit = Math.min(
      parseInt(limitParam || "12", 10) || 12,
      20
    )

    const top = await List.find(publicListsQuery())
      .sort({ likesCount: -1, createdAt: -1 })
      .limit(limit)
      .populate("createdBy", "name image")
      .populate({
        path: "placeIds",
        select: "name neighborhood photos type slug",
        options: { limit: 4 },
      })
      .lean()

    return NextResponse.json(
      { lists: top.map((list) => serializeListForCommunity(list as never)) },
      {
        headers: {
          "Cache-Control": "public, max-age=120, stale-while-revalidate=60",
        },
      }
    )
  } catch (error) {
    logApiError("/api/lists GET", error, { request })
    return NextResponse.json(
      { error: "Error al obtener listas" },
      { status: 500 }
    )
  }
}

/** POST: Crear lista (auth requerido) */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request)
    if (session instanceof NextResponse) return session

    await connectDB()

    const rateLimit = await checkRateLimit(session.user.id, "list_create", 5)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Límite alcanzado. Podés crear hasta 5 listas por día. Quedan ${rateLimit.remaining} disponibles.`,
        },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { name, description, placeIds, placeNotes, destination, coverImage } =
      body

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "El nombre es obligatorio" },
        { status: 400 }
      )
    }

    const requestedVisibility = parseVisibility(body.visibility)
    if (requestedVisibility === LIST_VISIBILITY.PRIVATE_LINK) {
      if (
        !canUsePrivateLists({
          email: session.user.email,
          role: session.user.role,
        })
      ) {
        return NextResponse.json(
          { error: "Listas privadas no disponibles para tu cuenta" },
          { status: 403 }
        )
      }
    }

    const validPlaceIds = toObjectIds(normalizePlaceIdStrings(placeIds))
    const notes = normalizePlaceNotes(
      placeNotes,
      validPlaceIds.map((id) => id.toString())
    ).map((n) => ({
      placeId: new mongoose.Types.ObjectId(n.placeId),
      note: n.note,
    }))
    const visibilityFields = applyVisibilityFields({
      visibility: requestedVisibility,
    })

    const list = new List({
      name: name.trim().slice(0, 80),
      description:
        typeof description === "string"
          ? description.trim().slice(0, 300) || undefined
          : undefined,
      destination: normalizeDestination(destination),
      coverImage: normalizeCoverImage(coverImage),
      placeIds: validPlaceIds,
      placeNotes: notes,
      createdBy: new mongoose.Types.ObjectId(session.user.id),
      ...visibilityFields,
    })

    await list.save()
    await list.populate("placeIds", "name neighborhood photos type slug")
    await list.populate("createdBy", "name image")

    const lean = list.toObject()
    lean.privateAccessToken = visibilityFields.privateAccessToken

    return NextResponse.json(serializeListForOwner(lean as never), {
      status: 201,
    })
  } catch (error) {
    logApiError("/api/lists POST", error, { request })
    return NextResponse.json(
      { error: "Error al crear lista" },
      { status: 500 }
    )
  }
}
