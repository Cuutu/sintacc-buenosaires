import { metadata as mapaSinTacc } from "@/app/mapa-sin-tacc/page"
import { metadata as mapaCeliaco } from "@/app/mapa-celiaco/page"
import { metadata as mapaParaCeliacos } from "@/app/mapa-para-celiacos/page"
import { metadata as mapaLayout } from "@/app/mapa/layout"
import { buildMapaMetadata, mapaCanonicalUrl } from "@/lib/seo/mapa-metadata"
import { readFileSync } from "fs"
import path from "path"

describe("T3 mapa canónico", () => {
  const canonical = mapaCanonicalUrl()

  it("las 3 landings canonical + og.url = /mapa", () => {
    expect(canonical.endsWith("/mapa")).toBe(true)
    expect(mapaSinTacc.alternates?.canonical).toBe(canonical)
    expect(mapaCeliaco.alternates?.canonical).toBe(canonical)
    expect(mapaParaCeliacos.alternates?.canonical).toBe(canonical)
    expect(mapaSinTacc.openGraph?.url).toBe(canonical)
    expect(mapaCeliaco.openGraph?.url).toBe(canonical)
    expect(mapaParaCeliacos.openGraph?.url).toBe(canonical)
  })

  it("titles de landings sin | CeliMap ni trailing space", () => {
    for (const meta of [mapaSinTacc, mapaCeliaco, mapaParaCeliacos]) {
      const title = String(meta.title)
      const ogTitle = String(meta.openGraph?.title ?? title)
      expect(title).not.toContain("| CeliMap")
      expect(ogTitle).not.toContain("| CeliMap")
      expect(title).toBe(title.trimEnd())
      expect(ogTitle).toBe(ogTitle.trimEnd())
    }
  })

  it("/mapa sin searchParams es indexable + canonical /mapa", () => {
    const meta = buildMapaMetadata({})
    expect(meta.alternates?.canonical).toBe(canonical)
    expect(meta.robots).toEqual({ index: true, follow: true })
    expect(mapaLayout.alternates?.canonical).toBe(canonical)
    expect(mapaCanonicalUrl()).toBe(canonical)
    expect(String(mapaLayout.title)).toBe("Mapa de lugares sin TACC cerca tuyo")
    expect(String(mapaLayout.title)).not.toContain("| CeliMap")
    expect(String(mapaLayout.description)).toMatch(/opciones sin TACC cerca tuyo/)
    expect(String(mapaLayout.description)).not.toMatch(/Tucumán|Rosario/i)
  })

  it("/mapa?place= y ?citySlugs= → noindex + canonical /mapa", () => {
    const withPlace = buildMapaMetadata({ place: "abc" })
    expect(withPlace.robots).toEqual({ index: false, follow: true })
    expect(withPlace.alternates?.canonical).toBe(canonical)
    const withCity = buildMapaMetadata({ citySlugs: "mendoza" })
    expect(withCity.robots).toEqual({ index: false, follow: true })
    expect(withCity.alternates?.canonical).toBe(canonical)
  })

  it("utm irrelevante no dispara noindex", () => {
    const meta = buildMapaMetadata({ utm_source: "gsc" })
    expect(meta.robots).toEqual({ index: true, follow: true })
  })

  it("MapaSeoIntro tiene H1 en el árbol, no hidden en el H1", () => {
    const src = readFileSync(
      path.join(__dirname, "../../../components/mapa/MapaSeoIntro.tsx"),
      "utf8"
    )
    expect(src).toContain("<h1")
    expect(src).toContain("Mapa de lugares sin TACC cerca tuyo")
    expect(src).not.toContain("/sin-gluten/san-miguel-de-tucuman")
    expect(src).not.toContain("/sin-gluten/rosario")
    expect(src).toContain("/sin-gluten/buenos-aires")
    expect(src).toContain("/sin-gluten/la-plata")
    expect(src).toContain("/sin-gluten/cordoba")
    expect(src).toContain("/sin-gluten-argentina")
    expect(src).toContain("/restaurantes-sin-gluten")
    expect(src).toContain("sr-only")
    const h1Open = src.match(/<h1[^>]*>/)
    expect(h1Open?.[0]).toBeTruthy()
    expect(h1Open?.[0]).not.toContain("hidden")
    expect(src).toContain("hidden md:block")
  })
})
