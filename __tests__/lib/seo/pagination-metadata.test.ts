/**
 * @jest-environment node
 *
 * Metadata real de las landings paginadas (con la base simulada): canónica,
 * robots y título por página.
 */
// react cache() solo existe en el runtime de Server Components.
jest.mock("react", () => ({ ...jest.requireActual("react"), cache: <T,>(fn: T) => fn }))
jest.mock("@/lib/mongodb", () => ({ __esModule: true, default: jest.fn() }))
jest.mock("@/lib/seo/places", () => ({
  getPlacesByCity: jest.fn(async () => ({ places: [], total: 240, pages: 10 })),
  getPlacesByCityAndCategory: jest.fn(async () => ({ places: [], total: 120, pages: 5 })),
  getPlacesByCategory: jest.fn(async () => ({ places: [], total: 900, pages: 38 })),
  getCityPageStats: jest.fn(async () => ({ total: 240, dedicatedCount: 40, byType: {} })),
  getCityPlaceIndex: jest.fn(async () => []),
  getRecentReviewsForCity: jest.fn(async () => []),
  getTopNeighborhoods: jest.fn(async () => []),
}))

import { cityLandingMetadata } from "@/app/sin-gluten/[ciudadSlug]/city-landing"
import { categoryLandingMetadata } from "@/app/sin-gluten/[ciudadSlug]/[categoriaSlug]/category-landing"
import { nationalCategoryMetadata } from "@/app/categoria/[category]/national-category-landing"
import { getBaseUrl } from "@/lib/base-url"

const BASE = getBaseUrl()
const NOINDEX = { index: false, follow: true }

describe("ciudad", () => {
  it("página 1: canónica limpia e indexable", async () => {
    const meta = await cityLandingMetadata("cordoba", 1)
    expect(meta.alternates?.canonical).toBe(`${BASE}/sin-gluten/cordoba`)
    expect(meta.robots).toBeUndefined()
    expect(String(meta.title)).not.toMatch(/página/)
  })

  it("?page=3 (variante): canónica propia, indexable y título con la página", async () => {
    const meta = await cityLandingMetadata("cordoba", 3, undefined, true)
    expect(meta.alternates?.canonical).toBe(`${BASE}/sin-gluten/cordoba?page=3`)
    expect(meta.openGraph?.url).toBe(`${BASE}/sin-gluten/cordoba?page=3`)
    expect(meta.robots).toBeUndefined()
    expect(String(meta.title)).toMatch(/– página 3$/)
  })

  it("?page=1 explícito: noindex con la canónica limpia", async () => {
    const meta = await cityLandingMetadata("cordoba", 1, undefined, true)
    expect(meta.alternates?.canonical).toBe(`${BASE}/sin-gluten/cordoba`)
    expect(meta.robots).toEqual(NOINDEX)
  })

  it("?barrio=: noindex con la canónica limpia, aunque tenga ?page=", async () => {
    const meta = await cityLandingMetadata("cordoba", 2, "Nueva Córdoba", true)
    expect(meta.alternates?.canonical).toBe(`${BASE}/sin-gluten/cordoba`)
    expect(meta.robots).toEqual(NOINDEX)
  })

  it("página fuera de rango: noindex", async () => {
    const meta = await cityLandingMetadata("cordoba", 99, undefined, true)
    expect(meta.robots).toEqual(NOINDEX)
  })
})

describe("ciudad + categoría", () => {
  it("?page=2: canónica propia e indexable", async () => {
    const meta = await categoryLandingMetadata("buenos-aires", "restaurantes", 2, true)
    expect(meta.alternates?.canonical).toBe(`${BASE}/sin-gluten/buenos-aires/restaurantes?page=2`)
    expect(meta.robots).toBeUndefined()
    expect(String(meta.title)).toMatch(/– página 2$/)
  })

  it("página 1: canónica limpia", async () => {
    const meta = await categoryLandingMetadata("buenos-aires", "restaurantes", 1)
    expect(meta.alternates?.canonical).toBe(`${BASE}/sin-gluten/buenos-aires/restaurantes`)
    expect(meta.robots).toBeUndefined()
  })
})

describe("categoría nacional", () => {
  it("?page=4: canónica propia y título con la página", async () => {
    const meta = await nationalCategoryMetadata("restaurantes", 4, true)
    expect(meta.alternates?.canonical).toBe(`${BASE}/restaurantes-sin-gluten?page=4`)
    expect(meta.robots).toBeUndefined()
    expect(String(meta.title)).toMatch(/– página 4$/)
  })
})
