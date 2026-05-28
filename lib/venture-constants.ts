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

export const VENTURE_SAFETY_LEVELS = [
  { id: "fully_gf", label: "100% sin gluten", dot: "🟢" },
  { id: "gf_options", label: "Opciones sin gluten", dot: "🟡" },
  { id: "to_confirm", label: "A confirmar", dot: "⚪" },
] as const

export type VentureSafetyLevelId = (typeof VENTURE_SAFETY_LEVELS)[number]["id"]

export const ventureCategoryIds = VENTURE_CATEGORIES.map((c) => c.id)
export const ventureModalityIds = VENTURE_MODALITIES.map((m) => m.id)
export const ventureSafetyLevelIds = VENTURE_SAFETY_LEVELS.map((s) => s.id)

export function getCategoryLabel(id: string): string {
  return VENTURE_CATEGORIES.find((c) => c.id === id)?.label ?? id
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
