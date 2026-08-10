import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { List } from "@/models/List"
import "@/models/Place"
import "@/models/User"
import { requireAuth } from "@/lib/middleware"
import { checkRateLimit } from "@/lib/rate-limit"
import { logApiError } from "@/lib/logger"
import mongoose from "mongoose"
import {
  LIST_LINK_STATUS,
  LIST_VISIBILITY,
} from "@/lib/lists/constants"
import { canUsePrivateLists } from "@/lib/lists/access"
import { generatePrivateListToken } from "@/lib/lists/private-token"
import { serializeListForOwner } from "@/lib/lists/serialize"

type Action = "regenerate" | "revoke" | "enable"

/** POST: regenerar / revocar / rehabilitar enlace privado (solo owner) */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth(request)
    if (session instanceof NextResponse) return session

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

    if (list.visibility !== LIST_VISIBILITY.PRIVATE_LINK) {
      return NextResponse.json(
        { error: "La lista no es privada mediante enlace" },
        { status: 400 }
      )
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

    const body = await request.json().catch(() => ({}))
    const action = (body?.action as Action) || ""

    if (action === "regenerate") {
      list.privateAccessToken = generatePrivateListToken()
      list.linkStatus = LIST_LINK_STATUS.ACTIVE
    } else if (action === "revoke") {
      list.linkStatus = LIST_LINK_STATUS.REVOKED
    } else if (action === "enable") {
      if (!list.privateAccessToken) {
        list.privateAccessToken = generatePrivateListToken()
      }
      list.linkStatus = LIST_LINK_STATUS.ACTIVE
    } else {
      return NextResponse.json(
        { error: "Acción inválida. Usá regenerate, revoke o enable." },
        { status: 400 }
      )
    }

    await list.save()
    await list.populate("placeIds", "name neighborhood photos type slug")
    await list.populate("createdBy", "name image")

    return NextResponse.json(serializeListForOwner(list.toObject() as never), {
      headers: { "Cache-Control": "private, no-store" },
    })
  } catch (error) {
    logApiError("/api/lists/[id]/private-link POST", error, { request })
    return NextResponse.json(
      { error: "Error al actualizar enlace privado" },
      { status: 500 }
    )
  }
}
