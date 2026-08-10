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
import { canUsePrivateLists } from "@/lib/lists/access"
import { applyVisibilityFields } from "@/lib/lists/normalize"
import { serializeListForOwner } from "@/lib/lists/serialize"

/** POST: duplicar lista (solo owner) */
export async function POST(
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

    const source = await List.findById(id).select("+privateAccessToken")
    if (!source) {
      return NextResponse.json({ error: "Lista no encontrada" }, { status: 404 })
    }

    if (source.createdBy.toString() !== session.user.id) {
      return NextResponse.json({ error: "No tenés permiso" }, { status: 403 })
    }

    const rateLimit = await checkRateLimit(session.user.id, "list_create", 5)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Límite alcanzado. Podés crear hasta 5 listas por día. Quedan ${rateLimit.remaining} disponibles.`,
        },
        { status: 429 }
      )
    }

    let visibility = source.visibility || LIST_VISIBILITY.PUBLIC
    if (visibility === LIST_VISIBILITY.PRIVATE_LINK) {
      if (
        !canUsePrivateLists({
          email: session.user.email,
          role: session.user.role,
        })
      ) {
        visibility = LIST_VISIBILITY.PUBLIC
      }
    }

    const visibilityFields = applyVisibilityFields({ visibility })
    const copyName = `${source.name} (copia)`.slice(0, 80)

    const list = new List({
      name: copyName,
      description: source.description,
      destination: source.destination,
      coverImage: source.coverImage,
      placeIds: [...source.placeIds],
      placeNotes: source.placeNotes?.map((n) => ({
        placeId: n.placeId,
        note: n.note,
      })),
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
    logApiError("/api/lists/[id]/duplicate POST", error, { request })
    return NextResponse.json(
      { error: "Error al duplicar lista" },
      { status: 500 }
    )
  }
}
