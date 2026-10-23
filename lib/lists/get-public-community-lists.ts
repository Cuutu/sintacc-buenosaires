import connectDB from "@/lib/mongodb"
import { List } from "@/models/List"
import "@/models/Place"
import "@/models/User"
import { publicListsQuery } from "@/lib/lists/access"
import {
  LIST_CARD_PLACE_SELECT,
  LIST_VISIBLE_PLACES_MATCH,
  trimListForCard,
} from "@/lib/lists/card-places"
import { serializeListForCommunity } from "@/lib/lists/serialize"
import type { ListWithDetails } from "@/components/lists/ListCard"

const DEFAULT_LIMIT = 500

/**
 * Listas públicas para las tarjetas de /listas: cada una con `placesCount` (sus lugares
 * publicados, el mismo número que muestra el detalle) y sólo los primeros cargados,
 * para la foto.
 */
export async function findCommunityLists(limit: number) {
  const lists = await List.find(publicListsQuery())
    .sort({ likesCount: -1, createdAt: -1 })
    .limit(limit)
    .populate("createdBy", "name image")
    .populate({
      path: "placeIds",
      select: LIST_CARD_PLACE_SELECT,
      match: LIST_VISIBLE_PLACES_MATCH,
    })
    .lean()

  return lists.map((list) => serializeListForCommunity(trimListForCard(list) as never))
}

export async function getPublicCommunityLists(
  limit = DEFAULT_LIMIT
): Promise<ListWithDetails[]> {
  try {
    await connectDB()
    const serialized = await findCommunityLists(limit)
    return JSON.parse(JSON.stringify(serialized)) as ListWithDetails[]
  } catch (error) {
    console.error("[listas] getPublicCommunityLists failed:", error)
    return []
  }
}
