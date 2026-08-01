export type PlaceWithStats = {
  _id: { toString(): string }
  slug?: string | null
  name: string
  type: string
  neighborhood: string
  photos?: string[]
  tags?: string[]
  safetyLevel?: "dedicated_gf" | "gf_options" | "cross_contamination_risk" | "unknown"
  delivery?: { available?: boolean }
  /** Place ID de Google (ChIJ…) — usado por Places UI Kit en FeaturedCard */
  googlePlaceId?: string | null
  stats?: { avgRating?: number; totalReviews?: number; contaminationReportsCount?: number }
  googleSnapshot?: {
    rating?: number
    userRatingCount?: number
  } | null
}

export type PrimarySafetyLevel =
  | "dedicated_gf"
  | "gf_options"
  | "cross_contamination_risk"
  | "unknown"

const SAFETY_CONFIG = {
  dedicated_gf: {
    label: "100% sin gluten",
    dot: "🟢",
    className: "bg-primary/20 text-primary border-primary/40",
  },
  gf_options: {
    label: "Opciones sin gluten",
    dot: "🟡",
    className: "bg-amber-500/20 text-amber-400 border-amber-500/40",
  },
  cross_contamination_risk: {
    label: "Riesgo contaminación",
    dot: "🔴",
    className: "bg-destructive/20 text-destructive border-destructive/40",
  },
  unknown: {
    label: "Sin info verificada",
    dot: "⚪",
    className: "bg-muted/50 text-muted-foreground border-border",
  },
} as const

/** Tags que duplican el estado principal superpuesto — no van al cuerpo. */
const PRIMARY_SAFETY_TAGS = new Set([
  "100_gf",
  "opciones_sin_tacc",
  "sin_info",
])

function safetyFromTags(tags: string[] = []): PrimarySafetyLevel | undefined {
  if (tags.includes("100_gf") || tags.includes("certificado_sin_tacc")) {
    return "dedicated_gf"
  }
  if (tags.includes("opciones_sin_tacc")) return "gf_options"
  return undefined
}

/**
 * Infiere safetyLevel desde tags cuando no está seteado en el lugar.
 * Mantiene consistencia con la vista de detalle que muestra ambos.
 */
export function inferSafetyLevel(place: {
  safetyLevel?: PlaceWithStats["safetyLevel"]
  tags?: string[]
}): PlaceWithStats["safetyLevel"] {
  if (place.safetyLevel) return place.safetyLevel
  return safetyFromTags(place.tags)
}

/**
 * Fuente única de presentación del estado TACC en FeaturedCard.
 *
 * Regla:
 * 1. Si `safetyLevel` es un estado concreto (dedicated / opciones / riesgo) → ese.
 * 2. Si falta o es `unknown` → inferir desde tags (100_gf / certificado / opciones).
 * 3. Si no hay señal → `unknown`.
 *
 * Así no se muestra “Sin info verificada” junto a “100% sin gluten” por tags.
 */
export function resolvePrimarySafety(place: {
  safetyLevel?: PlaceWithStats["safetyLevel"]
  tags?: string[]
}): PrimarySafetyLevel {
  const level = place.safetyLevel
  if (
    level === "dedicated_gf" ||
    level === "gf_options" ||
    level === "cross_contamination_risk"
  ) {
    return level
  }
  return safetyFromTags(place.tags) ?? "unknown"
}

export function getSafetyBadge(safetyLevel?: PlaceWithStats["safetyLevel"] | PrimarySafetyLevel) {
  const key = safetyLevel ?? "unknown"
  return SAFETY_CONFIG[key] ?? SAFETY_CONFIG.unknown
}

/**
 * Detecta inconsistencias de datos (solo reporte; no muta DB).
 * Ej.: safetyLevel=unknown pero tags con 100_gf / certificado.
 */
export function getSafetyDataConflict(place: {
  name?: string
  safetyLevel?: PlaceWithStats["safetyLevel"]
  tags?: string[]
}): string | null {
  const field = place.safetyLevel
  const fromTags = safetyFromTags(place.tags)
  if ((!field || field === "unknown") && fromTags && fromTags !== "unknown") {
    return `${place.name ?? "lugar"}: safetyLevel=${field ?? "∅"} pero tags implican ${fromTags}`
  }
  if (
    field === "dedicated_gf" &&
    (place.tags ?? []).includes("opciones_sin_tacc") &&
    !(place.tags ?? []).includes("100_gf") &&
    !(place.tags ?? []).includes("certificado_sin_tacc")
  ) {
    return `${place.name ?? "lugar"}: safetyLevel=dedicated_gf pero solo tag opciones_sin_tacc`
  }
  if (field === "gf_options" && (place.tags ?? []).includes("100_gf")) {
    return `${place.name ?? "lugar"}: safetyLevel=gf_options pero tag 100_gf`
  }
  return null
}

/** @deprecated Prefer getFeaturedSecondaryTags — tags crudos sin filtrar primario. */
export function getDisplayTags(place: PlaceWithStats): string[] {
  const tags: string[] = []
  for (const tag of place.tags?.slice(0, 2) ?? []) {
    if (!tags.includes(tag)) tags.push(tag)
  }
  return tags
}

export type FeaturedSecondaryChip =
  | { kind: "nuevo" }
  | { kind: "tag"; tag: string }

/**
 * Badges del cuerpo: solo secundarios (sin repetir estado principal).
 * Máx. 2 visibles + contador `+N más`.
 */
export function getFeaturedSecondaryTags(
  place: PlaceWithStats,
  options?: { includeNuevo?: boolean }
): { chips: FeaturedSecondaryChip[]; extraCount: number } {
  const secondary = (place.tags ?? []).filter((tag) => !PRIMARY_SAFETY_TAGS.has(tag))
  const all: FeaturedSecondaryChip[] = []
  if (options?.includeNuevo) all.push({ kind: "nuevo" })
  for (const tag of secondary) {
    all.push({ kind: "tag", tag })
  }
  const chips = all.slice(0, 2)
  const extraCount = Math.max(0, all.length - chips.length)
  return { chips, extraCount }
}
