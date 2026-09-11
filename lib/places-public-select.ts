/**
 * Campos públicos para GET /api/places (detalle).
 * Excluye blobs enormes (IA, reviews Google) que rompen Data Cache de Vercel (~2MB).
 */
export const PUBLIC_PLACE_SELECT = [
  "-aiEnrichment",
  "-googleSync",
  "-googleSnapshot.reviews",
  "-googleSnapshot.glutenRelevant",
  "-googleSnapshot.glutenSignalSummary",
].join(" ")

/**
 * Selector ultra-liviano para listados/mapa (anti-scraping).
 * Omite campos contact-heavy que no se usan en cards del mapa.
 * MANTIENE: openingHours (usado en bottom sheet), googleSnapshot.rating/userRatingCount (para sort).
 */
export const PUBLIC_PLACE_LIST_SELECT = [
  "-aiEnrichment",
  "-googleSync",
  "-googleSnapshot.reviews",
  "-googleSnapshot.glutenRelevant",
  "-googleSnapshot.glutenSignalSummary",
  "-contact",
  "-delivery",
  "-description",
  "-editLog",
  "-seo",
  "-pickup",
  "-lastConfirmedAt",
  "-source",
].join(" ")
