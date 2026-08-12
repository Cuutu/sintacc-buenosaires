/**
 * Pluralización en español para stats (legacy StatsGrid).
 */
export function pluralizeLocales(count: number): string {
  return count === 1 ? "local" : "locales"
}

export function pluralizeExperiences(count: number): string {
  return count === 1 ? "experiencia" : "experiencias"
}

export function pluralizeUsers(count: number): string {
  return count === 1 ? "usuario" : "usuarios"
}

export { floorDisplayCount } from "@/lib/stats/floor-display-count"

/**
 * Formatea el número para display. Preferir floorDisplayCount en UI nueva.
 * usePlus: agrega "+" solo si count >= 10 (legacy).
 */
export function formatCount(count: number, usePlus = false): string {
  const formatted = count.toLocaleString("es-AR")
  if (usePlus && count >= 10) return `+${formatted}`
  return formatted
}
