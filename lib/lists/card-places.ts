/**
 * Lugares de una lista: una sola regla para contarlos y mostrarlos.
 *
 * Una lista guarda ids. Se cuentan y se muestran solo los lugares que existen y están
 * publicados (`approved`): así /listas, "Mis listas" y el detalle dicen lo mismo (antes
 * la tarjeta decía 4 y el detalle 8). Para las tarjetas se cuenta antes de recortar: la
 * foto sale de los primeros lugares, el número es el de la lista entera.
 */

/** Lugares que se cargan por tarjeta para elegir la foto. */
export const LIST_CARD_PREVIEW_PLACES = 4

/** Lugares de una lista que se muestran (populate con `match`). */
export const LIST_VISIBLE_PLACES_MATCH = { status: "approved" } as const

/** Campos para la tarjeta de la lista (foto y nombre). */
export const LIST_CARD_PLACE_SELECT = "name neighborhood photos type slug"

export function trimListForCard<T extends { placeIds?: unknown[] | null }>(
  list: T
): T & { placesCount: number } {
  const ids = Array.isArray(list.placeIds) ? list.placeIds.filter(Boolean) : []
  return {
    ...list,
    placesCount: ids.length,
    placeIds: ids.slice(0, LIST_CARD_PREVIEW_PLACES) as T["placeIds"],
  }
}

/** Cantidad de lugares de una lista ya serializada (tarjeta o detalle). */
export function listPlacesCount(list: { placesCount?: number | null; placeIds?: unknown[] | null }): number {
  if (typeof list.placesCount === "number") return list.placesCount
  return Array.isArray(list.placeIds) ? list.placeIds.filter(Boolean).length : 0
}

export function formatPlacesCount(count: number): string {
  return `${count} ${count === 1 ? "lugar" : "lugares"}`
}
