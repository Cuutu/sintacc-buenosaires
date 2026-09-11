import { z } from "zod"
import connectDB from "@/lib/mongodb"
import { List } from "@/models/List"
import { publicListsQuery } from "@/lib/lists/access"
import { CANONICAL_ORIGIN } from "@/lib/base-url"
import { userTextToMongoRegex } from "@/lib/chat/regex"
import { normalizeChatZona } from "@/lib/chat/normalize-zona"

const RESULT_LIMIT = 5

export const buscarListasInputSchema = z.object({
  zona: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .optional()
    .describe("Barrio, ciudad o destino. Ej: Palermo, Córdoba, CABA."),
  q: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .optional()
    .describe("Texto libre si no hay zona. Nombre de lista o destino."),
})

export type BuscarListasInput = z.infer<typeof buscarListasInputSchema>

export type ChatListCard = {
  id: string
  nombre: string
  destino?: string
  lugares: number
  url: string
}

export type BuscarListasResult = {
  encontradas: number
  listas: ChatListCard[]
  error?: string
}

export function chatListUrl(id: string): string {
  return `${CANONICAL_ORIGIN}/listas/${id}`
}

export async function buscarListas(input: BuscarListasInput): Promise<BuscarListasResult> {
  const needle = normalizeChatZona(input.zona || input.q || "")
  if (needle.length < 2) {
    return { encontradas: 0, listas: [] }
  }

  try {
    await connectDB()
    const regex = userTextToMongoRegex(needle, true)
    const docs = await List.find({
      $and: [
        publicListsQuery(),
        { $or: [{ name: regex }, { destination: regex }, { description: regex }] },
      ],
    })
      .sort({ likesCount: -1, createdAt: -1 })
      .limit(RESULT_LIMIT)
      .select("name destination placeIds")
      .lean()

    const listas: ChatListCard[] = docs.map((doc) => {
      const id = String(doc._id)
      return {
        id,
        nombre: doc.name,
        destino: doc.destination || undefined,
        lugares: Array.isArray(doc.placeIds) ? doc.placeIds.length : 0,
        url: chatListUrl(id),
      }
    })

    return { encontradas: listas.length, listas }
  } catch {
    return {
      encontradas: 0,
      listas: [],
      error: "No pude consultar las listas. Pedile a la persona que pruebe de nuevo.",
    }
  }
}
