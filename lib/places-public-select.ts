/**
 * Campos públicos para GET /api/places.
 * Excluye blobs enormes (IA, reviews Google) que rompen Data Cache de Vercel (~2MB).
 */
export const PUBLIC_PLACE_SELECT = [
  "-aiEnrichment",
  "-googleSync",
  "-googleSnapshot.reviews",
  "-googleSnapshot.glutenRelevant",
  "-googleSnapshot.glutenSignalSummary",
].join(" ")
