function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "")
}

export function getBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_BASE_URL?.trim()
  if (explicit) {
    return stripTrailingSlash(explicit)
  }

  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
  if (production) {
    return stripTrailingSlash(`https://${production}`)
  }

  const vercel = process.env.VERCEL_URL?.trim()
  if (vercel) {
    return stripTrailingSlash(`https://${vercel}`)
  }

  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000"
  }

  throw new Error(
    "NEXT_PUBLIC_BASE_URL is not defined (set it in Vercel env or use VERCEL_URL)"
  )
}
