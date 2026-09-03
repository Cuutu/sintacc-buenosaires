import { readFileSync } from "fs"
import path from "path"
import { buildSeoPages, dedupeUrls, type SitemapPlace } from "@/lib/seo/sitemap-pages"
import { getPlacePath, isIndexablePlaceSlug } from "@/lib/place-url"
import { getPublishedGuides, FUTURE_GUIDE_TOPICS } from "@/lib/seo/guides"

const BASE = "https://www.celimap.com.ar"

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

describe("isIndexablePlaceSlug", () => {
  it("rechaza slug vacío o ausente", () => {
    expect(isIndexablePlaceSlug(undefined)).toBe(false)
    expect(isIndexablePlaceSlug("")).toBe(false)
    expect(isIndexablePlaceSlug("   ")).toBe(false)
  })

  it("rechaza ObjectId de 24 hex", () => {
    expect(isIndexablePlaceSlug("69a980cadebe71f1c8464444")).toBe(false)
  })

  it("acepta slug humano", () => {
    expect(isIndexablePlaceSlug("gout-caballito-caballito")).toBe(true)
  })

  it("no filtra slugs GSC con clics (approved vivos)", () => {
    const gscSlugs = [
      "gout-gluten-free-canning",
      "piacere-sin-tacc-ramos-mejia",
      "la-union-gluten-free-guemes-palermo",
      "campobravo-las-lomitas",
      "gout-gluten-free-caballito-caballito",
      "dalone-rock-san-isidro",
      "big-pons-unicenter",
      "dragon-porteno-belgrano",
      "la-union-gluten-free-belgrano-palermo",
      "la-chiperia-gastronomia-casera-libre-de-gluten",
      "gout-gluten-free-barracas-barracas",
      "la-union-gluten-free-olivos",
      "sin-tacc-corrientes-almagro",
      "el-rey-del-chipa",
      "rica-celi-gluten-free-recoleta",
    ]
    for (const slug of gscSlugs) {
      expect(isIndexablePlaceSlug(slug)).toBe(true)
    }
  })
})

describe("sitemap place URLs", () => {
  it("filtra ObjectId antes de getPlacePath; getPlacePath igual usa ObjectId si no hay slug", () => {
    const objectId = "69a980cadebe71f1c8464444"
    const places = [
      { _id: objectId, slug: objectId },
      { _id: objectId, slug: null },
      { _id: "ok", slug: "gout-caballito-caballito" },
    ]
    const urls = places
      .filter((p) => isIndexablePlaceSlug(p.slug))
      .map((p) => `${BASE}${getPlacePath(p)}`)
    expect(urls).toEqual([`${BASE}/lugar/gout-caballito-caballito`])
    expect(getPlacePath({ _id: objectId, slug: objectId })).toBe(`/lugar/${objectId}`)
  })
})

describe("sitemap static pages", () => {
  const sitemapSrc = readFileSync(
    path.join(__dirname, "../../../app/sitemap.ts"),
    "utf8"
  )

  it("lista estática no incluye /explorar", () => {
    expect(sitemapSrc).toMatch(/buildSitemapStaticPages/)
    expect(sitemapSrc).not.toMatch(/\$\{base\}\/explorar/)
    const staticBlock = sitemapSrc.slice(
      sitemapSrc.indexOf("export function buildSitemapStaticPages"),
      sitemapSrc.indexOf("function entry")
    )
    expect(staticBlock).toContain("${base}/guias")
    expect(staticBlock).not.toContain("/explorar")
  })
})

describe("getPublishedGuides slugs", () => {
  it("expone exactamente las 4 published", () => {
    expect(getPublishedGuides().map((g) => g.slug)).toEqual([
      "que-significa-100-libre-de-gluten",
      "diferencia-sin-tacc-y-opciones-sin-tacc",
      "que-preguntar-en-un-restaurante-si-sos-celiaco",
      "reducir-contaminacion-cruzada-al-comer-afuera",
    ])
    for (const slug of FUTURE_GUIDE_TOPICS) {
      expect(getPublishedGuides().some((g) => g.slug === slug)).toBe(false)
    }
  })
})

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
    expect(urls.some((u) => u.includes("/categoria/"))).toBe(false)
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

  it("incluye ciudades indexables y excluye top-sin-gluten (redirige a ciudad)", () => {
    const places: SitemapPlace[] = [
      makePlace({ _id: "1", province: "buenos-aires", locality: "la-plata", type: "restaurant" }),
      makePlace({ _id: "2", province: "buenos-aires", locality: "la-plata", type: "cafe" }),
      makePlace({ _id: "3", province: "buenos-aires", locality: "la-plata", type: "bakery" }),
    ]
    const pages = buildSeoPages(BASE, places)
    expect(pages.some((p) => p.url === `${BASE}/sin-gluten/la-plata`)).toBe(true)
    expect(pages.some((p) => p.url === `${BASE}/top-sin-gluten-la-plata`)).toBe(false)
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