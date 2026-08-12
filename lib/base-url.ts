/** Origen canónico único de producción (siempre con www). */
export const CANONICAL_ORIGIN = "https://www.celimap.com.ar"

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "")
}

/**
 * Si la URL apunta a celimap.com.ar (apex o www, http o https),
 * fuerza https://www.celimap.com.ar. Otros hosts (preview, localhost) se respetan.
 */
export function normalizeCanonicalOrigin(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return CANONICAL_ORIGIN
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`
    const parsed = new URL(withProtocol)
    const host = parsed.hostname.toLowerCase()
    if (host === "celimap.com.ar" || host === "www.celimap.com.ar") {
      return CANONICAL_ORIGIN
    }
    return stripTrailingSlash(parsed.origin)
  } catch {
    return stripTrailingSlash(trimmed)
  }
}

/**
 * Base URL para canonical, OG, JSON-LD, sitemap y robots.
 * En producción / env con celimap → siempre https://www.celimap.com.ar
 * (corrige NEXT_PUBLIC_BASE_URL mal seteado sin www).
 */
export function getBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_BASE_URL?.trim()
  if (explicit) {
    return normalizeCanonicalOrigin(explicit)
  }

  if (process.env.NODE_ENV === "production") {
    return CANONICAL_ORIGIN
  }

  const vercel = process.env.VERCEL_URL?.trim()
  if (vercel) {
    return normalizeCanonicalOrigin(`https://${vercel}`)
  }

  return "http://localhost:3000"
}

/** Helper de path absoluto canónico. */
export function absoluteUrl(path = "/"): string {
  const base = getBaseUrl()
  if (!path || path === "/") return base
  return `${base}${path.startsWith("/") ? path : `/${path}`}`
}
