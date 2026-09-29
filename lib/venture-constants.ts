/**
 * Emprendimientos: marcas/proyectos sin local físico en mapa.
 * Local abierto al público → /sugerir (Place). Venta IG/WA/delivery/ferias → acá.
 */

export const VENTURE_CATEGORIES = [
  { id: "panificados", label: "Panificados" },
  { id: "pasteleria", label: "Pastelería" },
  { id: "viandas", label: "Viandas" },
  { id: "congelados", label: "Congelados" },
  { id: "premezclas", label: "Premezclas" },
  { id: "catering", label: "Catering" },
  { id: "productos_artesanales", label: "Productos artesanales" },
  { id: "envios_domicilio", label: "Envíos a domicilio" },
  { id: "ferias_retiro", label: "Ferias / retiro" },
] as const

export type VentureCategoryId = (typeof VENTURE_CATEGORIES)[number]["id"]

export const VENTURE_MODALITIES = [
  { id: "delivery", label: "Delivery" },
  { id: "retiro", label: "Retiro" },
  { id: "envios", label: "Envíos" },
  { id: "ferias", label: "Ferias" },
] as const

export type VentureModalityId = (typeof VENTURE_MODALITIES)[number]["id"]

/** Claim de la fuente, no sello CeliMap. Card y ficha usan el mismo `label`. */
export const VENTURE_SAFETY_LEVELS = [
  { id: "fully_gf", label: "100% sin gluten", dot: "🟢" },
  { id: "gf_options", label: "Con opciones", dot: "🟡" },
  { id: "to_confirm", label: "A confirmar · no es certificación", dot: "⚪" },
] as const

export const VENTURE_SAFETY_DISCLAIMER =
  "CeliMap no certifica ni garantiza. Según datos cargados; confirmá siempre ingredientes y manipulación."

export const VENTURE_CATALOG_INTRO =
  "Solo emprendimientos 100% sin gluten. No listamos marcas que también vendan con gluten."

/** Suggest form: este catálogo no acepta “opciones”. Enum gf_options queda en DB/admin. */
export const VENTURE_SUGGEST_SAFETY_LEVELS = VENTURE_SAFETY_LEVELS.filter(
  (s) => s.id !== "gf_options"
)

export function isCatalogDedicatedVenture(safetyLevel?: string | null): boolean {
  return safetyLevel !== "gf_options"
}

export function dedicatedVentureMongoFilter(): { safetyLevel: { $ne: "gf_options" } } {
  return { safetyLevel: { $ne: "gf_options" } }
}

export type VentureSafetyLevelId = (typeof VENTURE_SAFETY_LEVELS)[number]["id"]

export const ventureCategoryIds = VENTURE_CATEGORIES.map((c) => c.id)
export const ventureModalityIds = VENTURE_MODALITIES.map((m) => m.id)
export const ventureSafetyLevelIds = VENTURE_SAFETY_LEVELS.map((s) => s.id)

export function getCategoryLabel(id: string): string {
  return VENTURE_CATEGORIES.find((c) => c.id === id)?.label ?? id
}

/**
 * Un emprendimiento puede tener varias categorías. `category` = principal (SEO, ícono,
 * relacionados); `categories` = todas. Docs viejos solo tienen `category`.
 */
export function getVentureCategories(venture: {
  category?: string | null
  categories?: readonly string[] | null
}): string[] {
  const list = venture.categories?.length
    ? venture.categories
    : venture.category
      ? [venture.category]
      : []
  return [...new Set(list)]
}

export function getCategoryLabels(ids: readonly string[]): string[] {
  return ids.map(getCategoryLabel)
}

/** `?category=panificados,viandas` → ids válidos, sin repetidos. */
export function parseVentureCategoryParam(value?: string | null): VentureCategoryId[] {
  if (!value) return []
  const valid = new Set<string>(ventureCategoryIds)
  return [...new Set(value.split(",").map((s) => s.trim()))].filter((id): id is VentureCategoryId =>
    valid.has(id)
  )
}

/** Match por cualquiera de las categorías; incluye docs viejos que solo tienen `category`. */
export function ventureCategoryMongoFilter(ids: readonly string[]): Record<string, unknown> {
  return { $or: [{ categories: { $in: ids } }, { category: { $in: ids } }] }
}

export function getModalityLabel(id: string): string {
  return VENTURE_MODALITIES.find((m) => m.id === id)?.label ?? id
}

export function getModalityLabels(ids: string[]): string[] {
  return ids.map(getModalityLabel)
}

export function getSafetyBadge(level?: string): { label: string; dot: string } {
  const found = VENTURE_SAFETY_LEVELS.find((s) => s.id === level)
  return found
    ? { label: found.label, dot: found.dot }
    : { label: "A confirmar", dot: "⚪" }
}
