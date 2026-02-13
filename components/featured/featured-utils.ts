export type PlaceWithStats = {
  _id: { toString(): string }
  name: string
  type: string
  neighborhood: string
  photos?: string[]
  tags?: string[]
  safetyLevel?: "dedicated_gf" | "gf_options" | "cross_contamination_risk" | "unknown"
  delivery?: { available?: boolean }
  stats?: { avgRating?: number; totalReviews?: number; contaminationReportsCount?: number }
}

const SAFETY_CONFIG = {
  dedicated_gf: { label: "100% sin gluten", dot: "🟢", className: "bg-primary/20 text-primary border-primary/40" },
  gf_options: { label: "Opciones sin gluten", dot: "🟡", className: "bg-amber-500/20 text-amber-400 border-amber-500/40" },
  cross_contamination_risk: { label: "Riesgo contaminación", dot: "🔴", className: "bg-destructive/20 text-destructive border-destructive/40" },
  unknown: { label: "Sin info verificada", dot: "⚪", className: "bg-muted/50 text-muted-foreground border-border" },
} as const

/**
 * Infiere safetyLevel desde tags cuando no está seteado en el lugar.
 * Mantiene consistencia con la vista de detalle que muestra ambos.
 */
export function inferSafetyLevel(place: {
  safetyLevel?: PlaceWithStats["safetyLevel"]
  tags?: string[]
}): PlaceWithStats["safetyLevel"] {
  if (place.safetyLevel) return place.safetyLevel
  const tags = place.tags ?? []
  if (tags.includes("100_gf") || tags.includes("certificado_sin_tacc"))
    return "dedicated_gf"
  if (tags.includes("opciones_sin_tacc")) return "gf_options"
  return undefined
}

export function getSafetyBadge(
  safetyLevel?: PlaceWithStats["safetyLevel"]
) {
  const key = safetyLevel ?? "unknown"
  return SAFETY_CONFIG[key] ?? SAFETY_CONFIG.unknown
}

/** Tags a mostrar como chips (máx 2) */
export function getDisplayTags(place: PlaceWithStats): string[] {
  const tags: string[] = []
  for (const tag of place.tags?.slice(0, 2) ?? []) {
    if (!tags.includes(tag)) tags.push(tag)
  }
  return tags
}
