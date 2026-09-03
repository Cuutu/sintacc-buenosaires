import { getCityBySlug } from "@/lib/seo/cities"
import {
  canonicalCityPlaceFilter,
  placeMatchesCanonicalCity,
} from "@/lib/seo/city-place-match"
import { buildSeoPages } from "@/lib/seo/sitemap-pages"
import { decideCityPageIndexing } from "@/lib/seo/indexing-rules"
import { getProvinceByName, getProvinceByAlias } from "@/lib/seo/provinces"

const BASE = "https://www.celimap.com.ar"

describe("canonicalCityPlaceFilter / placeMatchesCanonicalCity", () => {
  const rosario = getCityBySlug("rosario")!
  const smt = getCityBySlug("san-miguel-de-tucuman")!

  it("seed rosario = santa-fe + rosario", () => {
    expect(rosario.provinceSlug).toBe("santa-fe")
    expect(rosario.slug).toBe("rosario")
    expect(canonicalCityPlaceFilter(rosario)).toEqual({
      status: "approved",
      province: "santa-fe",
      locality: "rosario",
    })
  })

  it("fixture province santa-fe + locality rosario → match 1", () => {
    const place = { province: "santa-fe", locality: "rosario" }
    expect(placeMatchesCanonicalCity(place, rosario)).toBe(true)
  })

  it("display Santa Fe / Rosario no matchea (no alias B; diagnóstico 2026-09-03)", () => {
    expect(getProvinceByName("Santa Fe")?.slug).toBe("santa-fe")
    expect(getProvinceByAlias("Provincia de Santa Fe")?.slug).toBe("santa-fe")
    expect(
      placeMatchesCanonicalCity({ province: "Santa Fe", locality: "Rosario" }, rosario)
    ).toBe(false)
    expect(
      placeMatchesCanonicalCity({ province: null, locality: null }, rosario)
    ).toBe(false)
    expect(
      placeMatchesCanonicalCity(
        { province: undefined, locality: undefined },
        rosario
      )
    ).toBe(false)
  })

  it("yerba-buena no entra en san-miguel-de-tucuman", () => {
    expect(
      placeMatchesCanonicalCity(
        { province: "tucuman", locality: "yerba-buena" },
        smt
      )
    ).toBe(false)
    expect(
      placeMatchesCanonicalCity(
        { province: "tucuman", locality: "san-miguel-de-tucuman" },
        smt
      )
    ).toBe(true)
  })

  it("neighborhood Rosario / Centro no cuentan", () => {
    expect(
      placeMatchesCanonicalCity(
        { province: "santa-fe", locality: "centro" },
        rosario
      )
    ).toBe(false)
  })
})

describe("hubs rosario / SMT indexing", () => {
  it("decideCityPageIndexing(0, rosario) sigue noindex", () => {
    expect(decideCityPageIndexing(0, "rosario")).toBe("noindex")
    expect(decideCityPageIndexing(0, "san-miguel-de-tucuman")).toBe("noindex")
  })

  it("buildSeoPages: 0 lugares rosario → no URL", () => {
    const pages = buildSeoPages(BASE, [])
    expect(pages.some((p) => p.url === `${BASE}/sin-gluten/rosario`)).toBe(false)
    expect(
      pages.some((p) => p.url === `${BASE}/sin-gluten/san-miguel-de-tucuman`)
    ).toBe(false)
  })

  it("buildSeoPages: 1 lugar rosario canónico no alcanza umbral general (3)", () => {
    const pages = buildSeoPages(BASE, [
      {
        _id: { toString: () => "1" },
        province: "santa-fe",
        locality: "rosario",
        type: "restaurant",
        updatedAt: new Date("2026-01-01"),
      },
    ])
    expect(pages.some((p) => p.url === `${BASE}/sin-gluten/rosario`)).toBe(false)
  })

  it("buildSeoPages: 3 lugares rosario canónicos → URL", () => {
    const pages = buildSeoPages(BASE, [
      {
        _id: { toString: () => "1" },
        province: "santa-fe",
        locality: "rosario",
        type: "restaurant",
        updatedAt: new Date("2026-01-01"),
      },
      {
        _id: { toString: () => "2" },
        province: "santa-fe",
        locality: "rosario",
        type: "cafe",
        updatedAt: new Date("2026-01-01"),
      },
      {
        _id: { toString: () => "3" },
        province: "santa-fe",
        locality: "rosario",
        type: "bakery",
        updatedAt: new Date("2026-01-01"),
      },
    ])
    expect(pages.some((p) => p.url === `${BASE}/sin-gluten/rosario`)).toBe(true)
  })

  it("buildSeoPages: 1 SMT canónico entra (excepción minPlaces 1); yerba-buena no", () => {
    const pages = buildSeoPages(BASE, [
      {
        _id: { toString: () => "yb" },
        province: "tucuman",
        locality: "yerba-buena",
        type: "restaurant",
        updatedAt: new Date("2026-01-01"),
      },
    ])
    expect(
      pages.some((p) => p.url === `${BASE}/sin-gluten/san-miguel-de-tucuman`)
    ).toBe(false)

    const withSmt = buildSeoPages(BASE, [
      {
        _id: { toString: () => "smt" },
        province: "tucuman",
        locality: "san-miguel-de-tucuman",
        type: "restaurant",
        updatedAt: new Date("2026-01-01"),
      },
    ])
    expect(
      withSmt.some((p) => p.url === `${BASE}/sin-gluten/san-miguel-de-tucuman`)
    ).toBe(true)
  })
})
