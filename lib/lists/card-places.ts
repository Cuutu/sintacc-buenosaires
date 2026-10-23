/**
 * Tarjetas de /listas: la foto sale de los primeros lugares, pero el conteo tiene que ser
 * el de la lista entera. Por eso se cuenta antes de recortar (si se recorta en el populate,
 * la tarjeta dice "4 lugares" aunque la lista tenga 20).
 */

/** Lugares que se cargan por tarjeta para elegir la foto. */
export const LIST_CARD_PREVIEW_PLACES = 4

export function trimListForCard<T extends { placeIds?: unknown[] | null }>(
  list: T
): T & { placesCount: number } {
  const ids = Array.isArray(list.placeIds) ? list.placeIds : []
  return {
    ...list,
    placesCount: ids.length,
    placeIds: ids.slice(0, LIST_CARD_PREVIEW_PLACES) as T["placeIds"],
  }
}

export function formatPlacesCount(count: number): string {
  return `${count} ${count === 1 ? "lugar" : "lugares"}`
}
