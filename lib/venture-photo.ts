/**
 * Foto de emprendimiento: solo URLs ya persistidas en `photos[]`.
 * El modelo Venture no tiene `cover` ni OG de Instagram.
 * Front usa la primera URL no vacía (`photos[0]` en la práctica).
 */
export function getVentureCoverPhoto(photos?: Array<string | null | undefined> | null): string | null {
  if (!photos?.length) return null
  for (const raw of photos) {
    if (typeof raw !== "string") continue
    const url = raw.trim()
    if (url) return url
  }
  return null
}
