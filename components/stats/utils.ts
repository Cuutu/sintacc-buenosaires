/**
 * Pluralización en español para stats
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

/**
 * Formatea el número para display. Usa "+" solo si count >= 10
 */
export function formatCount(count: number, usePlus = false): string {
  const formatted = count.toLocaleString("es-AR")
  if (usePlus && count >= 10) return `+${formatted}`
  return formatted
}
