import { trackEvent } from "@/lib/analytics"
import { considerInAppReview } from "@/lib/native-review"

type FavoriteMutators = {
  add: (placeId: string) => void
  remove: (placeId: string) => void
}

/** Persistencia única de favorito. Trigger de review nativo vive acá, no en cada botón. */
export async function persistFavoriteToggle(
  placeId: string,
  currentlyFavorite: boolean,
  ids: Set<string>,
  mutators: FavoriteMutators
): Promise<"added" | "removed" | "error"> {
  try {
    if (currentlyFavorite) {
      const res = await fetch(`/api/favorites?placeId=${placeId}`, { method: "DELETE" })
      if (!res.ok) return "error"
      mutators.remove(placeId)
      trackEvent("favorite_remove", { placeId })
      return "removed"
    }

    const res = await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placeId }),
    })
    if (!res.ok && res.status !== 400) return "error"

    // ids es el Set previo al add (no se muta), por eso +1.
    // countAfterAdd se calcula ANTES de mutators.add para no depender de si add() muta `ids`.
    const wasNew = !ids.has(placeId)
    const countAfterAdd = wasNew ? ids.size + 1 : ids.size
    mutators.add(placeId)
    trackEvent("favorite_add", { placeId })
    if (wasNew && countAfterAdd >= 2) {
      considerInAppReview("favorite")
    }
    return "added"
  } catch (error) {
    console.error("Error toggling favorite:", error)
    return "error"
  }
}
