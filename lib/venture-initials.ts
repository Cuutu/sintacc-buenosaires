export function ventureInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((part) => /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(part))
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase()
  }
  return name.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, "").slice(0, 2).toUpperCase() || "·"
}
