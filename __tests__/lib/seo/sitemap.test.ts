import { buildSeoPages, dedupeUrls, type SitemapPlace } from "@/lib/seo/sitemap-pages"

const BASE = "https://celimap.com.ar"

function makePlace(overrides: Partial<SitemapPlace> & { _id: string }): SitemapPlace {
  const type = overrides.type ?? "restaurant"
  return {
    slug: `slug-${overrides._id}`,
    type,
    types: [type],
    neighborhood: "Centro",
    province: "cordoba",
    locality: "cordoba",
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  }
}

describe("lib/seo/sitemap-pages", () => {
  it("no genera URLs duplicadas (incluye /sin-gluten/cordoba una sola vez)", () => {
    const places: SitemapPlace[] = [
      makePlace({ _id: "1", province: "cordoba", locality: "cordoba", type: "restaurant" }),
      makePlace({ _id: "2", province: "cordoba", locality: "cordoba", type: "cafe" }),
      makePlace({ _id: "3", province: "cordoba", locality: "cordoba", type: "bakery" }),
      makePlace({ _id: "4", province: "cordoba", locality: "rio-cuarto", type: "store" }),
      makePlace({ _id: "5", province: "cordoba", locality: "rio-cuarto", type: "restaurant" }),
    ]
    const pages = buildSeoPages(BASE, places)
    const urls = pages.map((p) => p.url)
    expect(new Set(urls).size).toBe(urls.length)
    // /sin-gluten/cordoba aparece una sola vez (página de ciudad)
    expect(urls.filter((u) => u === `${BASE}/sin-gluten/cordoba`)).toHaveLength(1)
  })

  it("excluye páginas provinciales no indexables (menos de 5 lugares o 1 localidad)", () => {
    const places: SitemapPlace[] = [
      makePlace({ _id: "1", province: "tucuman", locality: "san-miguel-de-tucuman" }),
      makePlace({ _id: "2", province: "tucuman", locality: "san-miguel-de-tucuman" }),
    ]
    const pages = buildSeoPages(BASE, places)
    expect(pages.some((p) => p.url === `${BASE}/sin-gluten/provincia/tucuman`)).toBe(false)
  })

  it("incluye páginas provinciales indexables (≥5 lugares y ≥2 localidades)", () => {
    const places: SitemapPlace[] = [
      makePlace({ _id: "1", province: "tucuman", locality: "san-miguel-de-tucuman", type: "restaurant" }),
      makePlace({ _id: "2", province: "tucuman", locality: "san-miguel-de-tucuman", type: "cafe" }),
      makePlace({ _id: "3", province: "tucuman", locality: "san-miguel-de-tucuman", type: "bakery" }),
      makePlace({ _id: "4", province: "tucuman", locality: "yerba-buena", type: "store" }),
      makePlace({ _id: "5", province: "tucuman", locality: "yerba-buena", type: "restaurant" }),
    ]
    const pages = buildSeoPages(BASE, places)
    expect(pages.some((p) => p.url === `${BASE}/sin-gluten/provincia/tucuman`)).toBe(true)
  })

  it("excluye categorías provinciales con menos de 3 resultados", () => {
    const places: SitemapPlace[] = [
      makePlace({ _id: "1", province: "tucuman", locality: "san-miguel-de-tucuman", type: "restaurant" }),
      makePlace({ _id: "2", province: "tucuman", locality: "san-miguel-de-tucuman", type: "restaurant" }),
      makePlace({ _id: "3", province: "tucuman", locality: "san-miguel-de-tucuman", type: "cafe" }),
      makePlace({ _id: "4", province: "tucuman", locality: "yerba-buena", type: "cafe" }),
      makePlace({ _id: "5", province: "tucuman", locality: "yerba-buena", type: "bakery" }),
    ]
    const pages = buildSeoPages(BASE, places)
    // restaurantes tiene 2 → no indexable
    expect(pages.some((p) => p.url === `${BASE}/sin-gluten/provincia/tucuman/restaurantes`)).toBe(false)
    // cafes tiene 2 → no indexable
    expect(pages.some((p) => p.url === `${BASE}/sin-gluten/provincia/tucuman/cafes`)).toBe(false)
  })

  it("incluye categorías provinciales con ≥3 resultados", () => {
    const places: SitemapPlace[] = [
      makePlace({ _id: "1", province: "tucuman", locality: "san-miguel-de-tucuman", type: "restaurant" }),
      makePlace({ _id: "2", province: "tucuman", locality: "san-miguel-de-tucuman", type: "restaurant" }),
      makePlace({ _id: "3", province: "tucuman", locality: "yerba-buena", type: "restaurant" }),
      makePlace({ _id: "4", province: "tucuman", locality: "yerba-buena", type: "cafe" }),
      makePlace({ _id: "5", province: "tucuman", locality: "san-miguel-de-tucuman", type: "bakery" }),
    ]
    const pages = buildSeoPages(BASE, places)
    expect(pages.some((p) => p.url === `${BASE}/sin-gluten/provincia/tucuman/restaurantes`)).toBe(true)
  })

  it("lastmod de una URL solo cambia si cambia el updatedAt de sus lugares (no global)", () => {
    const places: SitemapPlace[] = [
      makePlace({ _id: "1", province: "cordoba", locality: "cordoba", updatedAt: new Date("2024-01-01") }),
      makePlace({ _id: "2", province: "cordoba", locality: "cordoba", updatedAt: new Date("2024-06-01") }),
      makePlace({ _id: "3", province: "cordoba", locality: "cordoba", updatedAt: new Date("2024-03-01") }),
      makePlace({ _id: "4", province: "tucuman", locality: "san-miguel-de-tucuman", updatedAt: new Date("2024-12-01") }),
    ]
    const pages = buildSeoPages(BASE, places)
    const cordobaPage = pages.find((p) => p.url === `${BASE}/sin-gluten/cordoba`)
    expect(cordobaPage?.lastModified).toEqual(new Date("2024-06-01"))
  })

  it("mantiene URLs de ciudades y fichas", () => {
    const places: SitemapPlace[] = [
      makePlace({ _id: "1", province: "buenos-aires", locality: "la-plata", type: "restaurant" }),
    ]
    const pages = buildSeoPages(BASE, places)
    expect(pages.some((p) => p.url === `${BASE}/sin-gluten/la-plata`)).toBe(true)
    expect(pages.some((p) => p.url === `${BASE}/top-sin-gluten-la-plata`)).toBe(true)
  })

  it("dedupeUrls elimina duplicados", () => {
    const pages = [
      { url: `${BASE}/sin-gluten/cordoba`, changeFrequency: "weekly" as const, priority: 0.8 },
      { url: `${BASE}/sin-gluten/cordoba`, changeFrequency: "weekly" as const, priority: 0.8 },
      { url: `${BASE}/sin-gluten/la-plata`, changeFrequency: "weekly" as const, priority: 0.8 },
    ]
    const deduped = dedupeUrls(pages)
    expect(deduped).toHaveLength(2)
  })
})