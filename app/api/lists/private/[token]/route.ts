import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { List } from "@/models/List"
import "@/models/Place"
import "@/models/User"
import { logApiError } from "@/lib/logger"
import { LIST_LINK_STATUS, LIST_VISIBILITY } from "@/lib/lists/constants"
import { isValidPrivateTokenFormat } from "@/lib/lists/private-token"
import { serializeListForPublicViewer } from "@/lib/lists/serialize"

const NOT_FOUND = NextResponse.json(
  { error: "Lista no encontrada" },
  {
    status: 404,
    headers: {
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
    },
  }
)

/** GET: vista cliente por token — sin auth. 404 uniforme si inválido/revocado. */
export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token
    if (!token || !isValidPrivateTokenFormat(token)) {
      return NOT_FOUND
    }

    await connectDB()

    const list = await List.findOne({
      privateAccessToken: token,
      visibility: LIST_VISIBILITY.PRIVATE_LINK,
      linkStatus: LIST_LINK_STATUS.ACTIVE,
    })
      .populate("createdBy", "name image")
      .populate("placeIds")
      .lean()

    if (!list) {
      return NOT_FOUND
    }

    return NextResponse.json(serializeListForPublicViewer(list as never), {
      headers: {
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
      },
    })
  } catch (error) {
    // No incluir token en route string de logs
    logApiError("/api/lists/private/[token] GET", error)
    return NextResponse.json(
      { error: "Error al obtener lista" },
      {
        status: 500,
        headers: {
          "Cache-Control": "private, no-store",
          "Referrer-Policy": "no-referrer",
        },
      }
    )
  }
}
