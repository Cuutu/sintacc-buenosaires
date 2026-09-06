import {
  isArgentinaPlace,
  argentinaPlaceMongoFilter,
  AR_PROVINCE_SLUGS,
  buildNationalCategoryMongoQuery,
} from "@/lib/seo/argentina-place"
import { PROVINCES } from "@/lib/seo/provinces"
import { buildSeoPages, type SitemapPlace } from "@/lib/seo/sitemap-pages"
import { readFileSync } from "fs"
import path from "path"

const BASE = "https://www.celimap.com.ar"

function makePlace(
  overrides: Partial<SitemapPlace> & { _id: string; status?: string }
): SitemapPlace & { status: string } {
  const type = overrides.type ?? "restaurant"
  return {
    slug: `slug-${overrides._id}`,
    type,
    types: [type],
    neighborhood: "Centro",
    province: "caba",
    locality: "caba",
    updatedAt: new Date("2024-01-01"),
    status: "approved",
    ...overrides,
  }
}

function matchesNationalHub(
  place: { status?: string; type?: string; types?: string[]; province?: string | null },
  type: string
): boolean {
  const query = buildNationalCategoryMongoQuery(type)
  const typeOk = place.type === type || Boolean(place.types?.includes(type))
  const provinceOk =
    typeof place.province === "string" && query.province.$in.includes(place.province)
  return place.status === query.status && typeOk && provinceOk
}

describe("isArgentinaPlace", () => {
  it("true para slugs de PROVINCES (caba, buenos-aires)", () => {
    expect(isArgentinaPlace({ province: "caba" })).toBe(true)
    expect(isArgentinaPlace({ province: "buenos-aires" })).toBe(true)
  })

  it("false si province ausente, vacío o no está en PROVINCES", () => {
    expect(isArgentinaPlace({ province: undefined })).toBe(false)
    expect(isArgentinaPlace({ province: null })).toBe(false)
    expect(isArgentinaPlace({ province: "" })).toBe(false)
    expect(isArgentinaPlace({ province: "   " })).toBe(false)
    expect(isArgentinaPlace({ province: "rio-de-janeiro" })).toBe(false)
    expect(isArgentinaPlace({ province: "brasil" })).toBe(false)
  })

  it("AR_PROVINCE_SLUGS cubre las 24 jurisdicciones y no incluye Brasil", () => {
    expect(AR_PROVINCE_SLUGS).toHaveLength(24)
    expect(AR_PROVINCE_SLUGS).toEqual(PROVINCES.map((p) => p.slug))
    expect(AR_PROVINCE_SLUGS).not.toContain("rio-de-janeiro")
    expect(AR_PROVINCE_SLUGS).not.toContain("brasil")
    expect(argentinaPlaceMongoFilter().province.$in).toEqual([...AR_PROVINCE_SLUGS])
  })
})

describe("getPlacesByCategory query (hub nacional)", () => {
  it("buildNationalCategoryMongoQuery filtra province ∈ AR, no Brasil", () => {
    const query = buildNationalCategoryMongoQuery("restaurant")
    expect(query.status).toBe("approved")
    expect(query.$or).toEqual([{ type: "restaurant" }, { types: "restaurant" }])
    expect(query.province.$in).toContain("caba")
    expect(query.province.$in).toContain("buenos-aires")
    expect(query.province.$in).not.toContain("rio-de-janeiro")
    expect(query.province.$in).not.toContain("brasil")
  })

  it("restaurant province null neighborhood Búzios NO entra; caba SÍ", () => {
    const buzios = makePlace({
      _id: "br-1",
      type: "restaurant",
      province: undefined,
      neighborhood: "Búzios",
      locality: "buzios",
    })
    const salvador = makePlace({
      _id: "br-2",
      type: "restaurant",
      province: null as unknown as string,
      neighborhood: "Salvador",
    })
    const caba = makePlace({
      _id: "ar-1",
      type: "restaurant",
      province: "caba",
      neighborhood: "Palermo",
    })

    expect(matchesNationalHub(buzios, "restaurant")).toBe(false)
    expect(matchesNationalHub(salvador, "restaurant")).toBe(false)
    expect(matchesNationalHub(caba, "restaurant")).toBe(true)
    expect(isArgentinaPlace(buzios)).toBe(false)
    expect(isArgentinaPlace(caba)).toBe(true)
  })

  it("getPlacesByCategory usa el query AR (no post-filter de 10k docs)", () => {
    const src = readFileSync(path.join(__dirname, "../../../lib/seo/places.ts"), "utf8")
    expect(src).toContain("buildNationalCategoryMongoQuery")
    const fn = src.slice(src.indexOf("export async function getPlacesByCategory"))
    const body = fn.slice(0, fn.indexOf("export async function getPlacesByCategoryAndCity"))
    expect(body).toContain("buildNationalCategoryMongoQuery(type)")
    expect(body).toContain("Place.find(query)")
    expect(body).toContain("Place.countDocuments(query)")
  })
})

describe("buildSeoPages categorías nacionales solo AR", () => {
  it("Búzios province null no entra en /restaurantes-sin-gluten; caba sí", () => {
    const buzios: SitemapPlace = {
      _id: { toString: () => "br-buzios" },
      type: "restaurant",
      types: ["restaurant"],
      neighborhood: "Búzios",
      province: undefined,
      locality: undefined,
      updatedAt: new Date("2026-09-01"),
    }
    const caba1 = makePlace({ _id: "ar-1", type: "restaurant", province: "caba" })
    const caba2 = makePlace({ _id: "ar-2", type: "restaurant", province: "caba" })

    const onlyBrazil = buildSeoPages(BASE, [buzios])
    expect(onlyBrazil.some((p) => p.url === `${BASE}/restaurantes-sin-gluten`)).toBe(false)

    const mixed = buildSeoPages(BASE, [buzios, caba1, caba2])
    expect(mixed.some((p) => p.url === `${BASE}/restaurantes-sin-gluten`)).toBe(true)
    const national = mixed.find((p) => p.url === `${BASE}/restaurantes-sin-gluten`)
    expect(national?.lastModified).toEqual(new Date("2024-01-01"))
  })

  it("1 restaurant AR + 1 Brasil no alcanza umbral (count ya filtrado)", () => {
    const pages = buildSeoPages(BASE, [
      makePlace({ _id: "ar-1", type: "restaurant", province: "caba" }),
      {
        _id: { toString: () => "br-1" },
        type: "restaurant",
        neighborhood: "Salvador",
        province: undefined,
        updatedAt: new Date("2026-09-01"),
      },
    ])
    expect(pages.some((p) => p.url === `${BASE}/restaurantes-sin-gluten`)).toBe(false)
  })

  it("no usa regex Búzios/Salvador como filtro del sitemap nacional", () => {
    const src = readFileSync(
      path.join(__dirname, "../../../lib/seo/sitemap-pages.ts"),
      "utf8"
    )
    expect(src).toContain("isArgentinaPlace")
    expect(src).not.toMatch(/B[uú]zios/)
    expect(src).not.toMatch(/Salvador/)
    expect(src).not.toMatch(/Brasil/)
  })
})
