import connectDB from "@/lib/mongodb"
import { List } from "@/models/List"
import "@/models/Place"
import "@/models/User"
import { publicListsQuery } from "@/lib/lists/access"
import { serializeListForCommunity } from "@/lib/lists/serialize"
import type { ListWithDetails } from "@/components/lists/ListCard"

const DEFAULT_LIMIT = 500

export async function getPublicCommunityLists(
  limit = DEFAULT_LIMIT
): Promise<ListWithDetails[]> {
  try {
    await connectDB()
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

    const serialized = top.map((list) => serializeListForCommunity(list as never))
    return JSON.parse(JSON.stringify(serialized)) as ListWithDetails[]
  } catch (error) {
    console.error("[listas] getPublicCommunityLists failed:", error)
    return []
  }
}
