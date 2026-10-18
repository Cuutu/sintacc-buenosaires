import connectDB from "@/lib/mongodb"
import { revalidatePlacePages } from "@/lib/api-cache"
import { Place } from "@/models/Place"

/**
 * Revalida la ficha de un lugar del que solo tenemos el id (p. ej. al moderar una
 * reseña). Busca el slug porque la ficha se cachea con las dos URLs.
 * Fail-soft: si falla, la ficha se actualiza sola dentro de la hora.
 */
export async function revalidatePlacePagesById(placeId: { toString(): string }): Promise<void> {
  try {
    await connectDB()
    const place = await Place.findById(placeId).select("_id slug").lean<{ _id: { toString(): string }; slug?: string }>()
    if (place) revalidatePlacePages(place)
  } catch {
    /* la ficha se revalida sola en 1 h */
  }
}
