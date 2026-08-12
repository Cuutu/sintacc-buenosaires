/**
 * Fixtures mínimos herméticos — sin PII, sin Mongo, sin prod.
 * Si el contrato de API cambia, assertContract* falla visible.
 */

export const E2E_STATS = {
  placesCount: 42,
  reviewsCount: 17,
  usersCount: 9,
  reviewsCountCelimap: 17,
  reviewsCountGoogle: 0,
} as const

/** ObjectId-shaped id (24 hex) — no es dato real. */
export const E2E_PLACE_ID = "aaaaaaaaaaaaaaaaaaaaaaaa"

export const E2E_PLACE = {
  _id: E2E_PLACE_ID,
  name: "Local E2E Fixture",
  type: "restaurant" as const,
  address: "Calle de Prueba 100",
  neighborhood: "Palermo",
  slug: "local-e2e-fixture",
  location: { lat: -34.5875, lng: -58.425 },
  tags: [] as string[],
  photos: [] as string[],
  status: "approved" as const,
  stats: {
    avgRating: 4.5,
    totalReviews: 3,
    contaminationReportsCount: 0,
  },
}

export const E2E_PLACES_LIST = {
  places: [E2E_PLACE],
  pagination: { page: 1, limit: 50, total: 1, pages: 1 },
} as const

export const E2E_LISTS_EMPTY = { lists: [] as const }

export const E2E_FAVORITES_EMPTY = { favorites: [] as const }

/** NextAuth: sesión válida no autenticada → body `null` + 200. */
export const E2E_SESSION_UNAUTH = null

/** Sesión autenticada mínima (sin PII real). */
export const E2E_SESSION_AUTH = {
  user: {
    name: "E2E User",
    email: "e2e@example.com",
    image: "https://lh3.googleusercontent.com/a/e2e-fixture",
    role: "user",
  },
  expires: "2099-01-01T00:00:00.000Z",
} as const

export const E2E_CSRF = { csrfToken: "e2e-hermetic-csrf-token" }

export const E2E_PROVIDERS = {
  google: {
    id: "google",
    name: "Google",
    type: "oauth",
    signinUrl: "/api/auth/signin/google",
    callbackUrl: "/api/auth/callback/google",
  },
}

export function assertStatsContract(body: unknown): asserts body is typeof E2E_STATS {
  if (!body || typeof body !== "object") throw new Error("stats contract: body not object")
  const o = body as Record<string, unknown>
  for (const key of ["placesCount", "reviewsCount", "usersCount"] as const) {
    if (typeof o[key] !== "number") {
      throw new Error(`stats contract: missing number ${key}`)
    }
  }
}

export function assertPlacesListContract(body: unknown): void {
  if (!body || typeof body !== "object") throw new Error("places contract: body not object")
  const o = body as Record<string, unknown>
  if (!Array.isArray(o.places)) throw new Error("places contract: places[] required")
  if (!o.pagination || typeof o.pagination !== "object") {
    throw new Error("places contract: pagination required")
  }
  const p = o.pagination as Record<string, unknown>
  for (const key of ["page", "limit", "total", "pages"] as const) {
    if (typeof p[key] !== "number") throw new Error(`places contract: pagination.${key}`)
  }
  for (const place of o.places as unknown[]) {
    if (!place || typeof place !== "object") throw new Error("places contract: place item")
    const pl = place as Record<string, unknown>
    if (typeof pl._id !== "string" && typeof pl._id !== "object") {
      throw new Error("places contract: place._id")
    }
    if (typeof pl.name !== "string") throw new Error("places contract: place.name")
    if (!pl.location || typeof pl.location !== "object") {
      throw new Error("places contract: place.location")
    }
    const loc = pl.location as Record<string, unknown>
    if (typeof loc.lat !== "number" || typeof loc.lng !== "number") {
      throw new Error("places contract: place.location.lat/lng")
    }
  }
}

export function assertListsContract(body: unknown): void {
  if (!body || typeof body !== "object") throw new Error("lists contract: body not object")
  if (!Array.isArray((body as { lists?: unknown }).lists)) {
    throw new Error("lists contract: lists[] required")
  }
}

export function assertFavoritesContract(body: unknown): void {
  if (!body || typeof body !== "object") throw new Error("favorites contract: body not object")
  if (!Array.isArray((body as { favorites?: unknown }).favorites)) {
    throw new Error("favorites contract: favorites[] required")
  }
}
