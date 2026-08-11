import mongoose from "mongoose"
import { requireAuth, getOptionalActiveSession } from "@/lib/middleware"
import { checkRateLimit } from "@/lib/rate-limit"
import { logApiError } from "@/lib/logger"
import { LIST_VISIBILITY } from "@/lib/lists/constants"
import {
  canUsePrivateLists,
  isPublicListVisibility,
  ownerIdEquals,
} from "@/lib/lists/access"
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
import connectDB from "@/lib/mongodb"
import { List } from "@/models/List"
import { ListLike } from "@/models/ListLike"
import "@/models/Place"
import "@/models/User"
import { NextRequest, NextResponse } from "next/server"

/** GET: pública por ID, o owner (incluye privadas) */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()

    const id = params.id
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    const session = await getOptionalActiveSession()
    const list = await List.findById(id)
      .select("+privateAccessToken")
      .populate("createdBy", "name image")
      .populate("placeIds")
      .lean()

    if (!list) {
      return NextResponse.json({ error: "Lista no encontrada" }, { status: 404 })
    }

    const isOwner = ownerIdEquals(list.createdBy, session?.user?.id)

    if (isOwner) {
      return NextResponse.json(serializeListForOwner(list as never), {
        headers: { "Cache-Control": "private, no-store" },
      })
    }

    if (!isPublicListVisibility(list.visibility, list.isPublic)) {
      return NextResponse.json({ error: "Lista no encontrada" }, { status: 404 })
    }

    return NextResponse.json(serializeListForCommunity(list as never), {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=30",
      },
    })
  } catch (error) {
    logApiError("/api/lists/[id] GET", error, { request })
    return NextResponse.json(
      { error: "Error al obtener lista" },
      { status: 500 }
    )
  }
}

/** PATCH: Actualizar lista (solo owner) */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth(request)
    if (session instanceof NextResponse) return session

    await connectDB()

    const id = params.id
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    const list = await List.findById(id).select("+privateAccessToken")
    if (!list) {
      return NextResponse.json({ error: "Lista no encontrada" }, { status: 404 })
    }

    if (list.createdBy.toString() !== session.user.id) {
      return NextResponse.json({ error: "No tenés permiso" }, { status: 403 })
    }

    const rateLimit = await checkRateLimit(session.user.id, "list_edit", 20)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Límite alcanzado. Podés editar hasta 20 listas por día. Quedan ${rateLimit.remaining} disponibles.`,
        },
        { status: 429 }
      )
    }

    const body = await request.json()
    if (body.name !== undefined) {
      list.name =
        typeof body.name === "string" ? body.name.trim().slice(0, 80) : list.name
    }
    if (body.description !== undefined) {
      list.description =
        typeof body.description === "string"
          ? body.description.trim().slice(0, 300)
          : body.description
    }
    if (body.destination !== undefined) {
      list.destination = normalizeDestination(body.destination)
    }
    if (body.coverImage !== undefined) {
      const nextCover = normalizeCoverImage(body.coverImage)
      if (nextCover === null) {
        list.coverImage = undefined
      } else if (nextCover !== undefined) {
        list.coverImage = nextCover
      }
    }
    if (Array.isArray(body.placeIds)) {
      list.placeIds = normalizePlaceIdStrings(body.placeIds).map(
        (id) => new mongoose.Types.ObjectId(id)
      )
    }
    if (body.placeNotes !== undefined || Array.isArray(body.placeIds)) {
      const idStrings = list.placeIds.map((id) => id.toString())
      list.placeNotes = normalizePlaceNotes(
        body.placeNotes !== undefined ? body.placeNotes : list.placeNotes,
        idStrings
      ).map((n) => ({
        placeId: new mongoose.Types.ObjectId(n.placeId),
        note: n.note,
      }))
    }

    if (body.visibility !== undefined) {
      const nextVisibility = parseVisibility(body.visibility, list.visibility)
      if (nextVisibility === LIST_VISIBILITY.PRIVATE_LINK) {
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
      const fields = applyVisibilityFields({
        visibility: nextVisibility,
        existingToken: list.privateAccessToken,
        existingStatus: list.linkStatus,
      })
      list.visibility = fields.visibility
      list.isPublic = fields.isPublic
      list.privateAccessToken = fields.privateAccessToken
      list.linkStatus = fields.linkStatus
    }

    await list.save()
    await list.populate("placeIds", "name neighborhood photos type slug")
    await list.populate("createdBy", "name image")

    const lean = list.toObject()
    return NextResponse.json(serializeListForOwner(lean as never))
  } catch (error) {
    logApiError("/api/lists/[id] PATCH", error, { request })
    return NextResponse.json(
      { error: "Error al actualizar lista" },
      { status: 500 }
    )
  }
}

/** DELETE: Eliminar lista (solo owner) */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth(request)
    if (session instanceof NextResponse) return session

    await connectDB()

    const id = params.id
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    const list = await List.findById(id)
    if (!list) {
      return NextResponse.json({ error: "Lista no encontrada" }, { status: 404 })
    }

    if (list.createdBy.toString() !== session.user.id) {
      return NextResponse.json({ error: "No tenés permiso" }, { status: 403 })
    }

    const rateLimit = await checkRateLimit(session.user.id, "list_delete", 10)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Límite alcanzado. Podés eliminar hasta 10 listas por día. Quedan ${rateLimit.remaining} disponibles.`,
        },
        { status: 429 }
      )
    }

    await Promise.all([
      List.findByIdAndDelete(id),
      ListLike.deleteMany({ listId: new mongoose.Types.ObjectId(id) }),
    ])

    return NextResponse.json({ message: "Lista eliminada" })
  } catch (error) {
    logApiError("/api/lists/[id] DELETE", error, { request })
    return NextResponse.json(
      { error: "Error al eliminar lista" },
      { status: 500 }
    )
  }
}
