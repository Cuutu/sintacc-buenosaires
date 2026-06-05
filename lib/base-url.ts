/** URL canónica si no hay env (build local, sitemap, metadata) */
const CANONICAL_FALLBACK = "https://www.celimap.com.ar"

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "")
}

export function getBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_BASE_URL?.trim()
  if (explicit) {
    return stripTrailingSlash(explicit)
  }

  if (process.env.NODE_ENV === "production") {
    return stripTrailingSlash(CANONICAL_FALLBACK)
  }

  const vercel = process.env.VERCEL_URL?.trim()
  if (vercel) {
    return stripTrailingSlash(`https://${vercel}`)
  }

  return "http://localhost:3000"
}
