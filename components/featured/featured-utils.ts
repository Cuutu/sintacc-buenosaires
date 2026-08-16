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
    className: "bg-olive/10 text-olive border-olive/25",
  },
  gf_options: {
    label: "Tiene opciones",
    dot: "🟡",
    className: "bg-[#C85A2E]/10 text-[#A84A26] border-[#C85A2E]/30",
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

/** Tags que ya se muestran vía badge/hero de safety — no repetir en detalle. */
const SAFETY_BADGE_TAGS = new Set(["100_gf", "opciones_sin_tacc"])

/** Certificado = materia prima, no cocina dedicada. Solo `100_gf` es 100%. */
export function safetyFromTags(tags: string[] = []): PrimarySafetyLevel | undefined {
  // Si hay gluten en el local, nunca venderlo como 100% aunque también tenga 100_gf.
  if (tags.includes("opciones_sin_tacc")) return "gf_options"
  if (tags.includes("100_gf")) return "dedicated_gf"
  return undefined
}

/**
 * Fuente de verdad: tags primero; `safetyLevel` solo si no hay señal en tags.
 * Evita “VERIFICADO / 100%” cuando el tag dice opciones (y viceversa).
 */
export function inferSafetyLevel(place: {
  safetyLevel?: PlaceWithStats["safetyLevel"]
  tags?: string[]
}): PlaceWithStats["safetyLevel"] {
  return safetyFromTags(place.tags) ?? place.safetyLevel
}

/**
 * Fuente única de presentación del estado TACC (Featured / detalle / mapa).
 *
 * Regla:
 * 1. Si tags implican dedicated / opciones → ese.
 * 2. Si no, usar `safetyLevel` concreto (dedicated / opciones / riesgo).
 * 3. Si no hay señal → `unknown`.
 */
export function resolvePrimarySafety(place: {
  safetyLevel?: PlaceWithStats["safetyLevel"]
  tags?: string[]
}): PrimarySafetyLevel {
  const fromTags = safetyFromTags(place.tags)
  if (fromTags) return fromTags
  const level = place.safetyLevel
  if (
    level === "dedicated_gf" ||
    level === "gf_options" ||
    level === "cross_contamination_risk"
  ) {
    return level
  }
  return "unknown"
}

/** Tags de detalle/lista sin duplicar el badge principal de safety. */
export function getNonPrimarySafetyTags(tags: string[] = []): string[] {
  return tags.filter((tag) => !SAFETY_BADGE_TAGS.has(tag))
}

export function getSafetyBadge(safetyLevel?: PlaceWithStats["safetyLevel"] | PrimarySafetyLevel) {
  const key = safetyLevel ?? "unknown"
  return SAFETY_CONFIG[key] ?? SAFETY_CONFIG.unknown
}

/**
 * Detecta inconsistencias de datos (solo reporte; no muta DB).
 * Tag es fuente de verdad: flaggea si `safetyLevel` diverge o falta.
 */
export function getSafetyDataConflict(place: {
  name?: string
  safetyLevel?: PlaceWithStats["safetyLevel"]
  tags?: string[]
}): string | null {
  const field = place.safetyLevel
  const fromTags = safetyFromTags(place.tags)
  if (!fromTags) return null
  if (!field || field === "unknown") {
    return `${place.name ?? "lugar"}: safetyLevel=${field ?? "∅"} pero tags implican ${fromTags}`
  }
  if (field !== fromTags) {
    return `${place.name ?? "lugar"}: safetyLevel=${field} pero tags implican ${fromTags}`
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
