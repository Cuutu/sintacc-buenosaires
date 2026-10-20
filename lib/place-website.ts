import { isGoogleMapsUrl } from "@/lib/place-research/resolve-maps-url"

/**
 * El campo `contact.url` de un lugar es "Sitio web / Google Maps": el formulario
 * de sugerir pide el link de Maps ahí, y la sincronización con Google lo usa para
 * encontrar el lugar. En la ficha, en cambio, un link de Maps no es un sitio web
 * (la dirección ya abre Maps). Estas funciones separan una cosa de la otra.
 */

/** Links cortos de Google que abren la ficha de Maps del negocio. */
const GOOGLE_SHARE_HOSTS = new Set(["g.page", "share.google", "g.co"])

function withProtocol(url: string): string {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(url) ? url : `https://${url}`
}

/** ¿Es un link de Google Maps (o un link corto de Google que abre Maps)? */
export function isMapsLink(raw: string | null | undefined): boolean {
  const url = raw?.trim()
  if (!url) return false
  const full = withProtocol(url)
  try {
    const host = new URL(full).hostname.toLowerCase().replace(/^www\./, "")
    if (GOOGLE_SHARE_HOSTS.has(host)) return true
  } catch {
    return false
  }
  return isGoogleMapsUrl(full)
}

/** Sitio web para mostrar o publicar. Null si está vacío o es un link de Maps. */
export function getPublicWebsite(raw: string | null | undefined): string | null {
  const url = raw?.trim()
  if (!url || isMapsLink(url)) return null
  return url
}

/** El link de Maps cargado en `contact.url`, si lo es. */
export function getMapsLink(raw: string | null | undefined): string | null {
  const url = raw?.trim()
  if (!url || !isMapsLink(url)) return null
  return withProtocol(url)
}

/**
 * ¿Conviene reemplazar `current` por la web que da Google? Solo si lo cargado está
 * vacío o es un link de Maps, y lo de Google es una web de verdad.
 */
export function shouldUseGoogleWebsite(
  current: string | null | undefined,
  googleWebsite: string | null | undefined
): boolean {
  const candidate = googleWebsite?.trim()
  if (!candidate || isMapsLink(candidate)) return false
  const now = current?.trim()
  return !now || isMapsLink(now)
}
