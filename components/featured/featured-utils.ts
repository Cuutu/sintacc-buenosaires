export type PlaceWithStats = {
  _id: { toString(): string }
  name: string
  type: string
  neighborhood: string
  photos?: string[]
  tags?: string[]
  safetyLevel?: "dedicated_gf" | "gf_options" | "cross_contamination_risk" | "unknown"
  delivery?: { available?: boolean }
  stats?: { avgRating?: number; totalReviews?: number }
}

const SAFETY_CONFIG = {
  dedicated_gf: { label: "100% sin TACC", dot: "🟢" },
  gf_options: { label: "Opciones sin TACC", dot: "🟡" },
  cross_contamination_risk: { label: "Riesgo contaminación", dot: "🔴" },
  unknown: { label: "Sin info", dot: "⚪" },
} as const

const TAG_LABELS: Record<string, string> = {
  certificado_sin_tacc: "Certificado",
  cocina_separada: "Cocina separada",
  "100_gf": "100% GF",
  opciones_sin_tacc: "Opciones sin TACC",
  delivery: "Delivery",
}

export function getSafetyBadge(
  safetyLevel?: PlaceWithStats["safetyLevel"]
) {
  const key = safetyLevel ?? "unknown"
  return SAFETY_CONFIG[key] ?? SAFETY_CONFIG.unknown
}

export function getDisplayChips(place: PlaceWithStats): string[] {
  const chips: string[] = []
  if (place.delivery?.available) chips.push("Delivery")
  for (const tag of place.tags?.slice(0, 2) ?? []) {
    const label = TAG_LABELS[tag] ?? tag.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    if (!chips.includes(label)) chips.push(label)
  }
  return chips.slice(0, 2)
}
