import { getCityBySlug } from "@/lib/seo/cities"
import {
  getCityTitle,
  getCityDescription,
  getCityH1,
  getCategoryTitle,
  getCategoryDescription,
  getCategoryH1,
  getCategoryIntro,
  getCityCategoryNavLabel,
  getArgentinaLandingTitle,
  getArgentinaLandingDescription,
} from "@/lib/seo/templates"
import { decideCityPageIndexing } from "@/lib/seo/indexing-rules"

const laPlata = getCityBySlug("la-plata")!
const cordoba = getCityBySlug("cordoba")!

describe("getCityTitle / getCityDescription", () => {
  const laPlataLive = { total: 8, dedicatedGf: 6, gfOptions: 2 }

  it("La Plata hub: title CTR sin marca (layout agrega | CeliMap); H1 corto; description pedida", () => {
    const title = getCityTitle(laPlata, laPlataLive)
    const description = getCityDescription(laPlata, laPlataLive)
    const h1 = getCityH1(laPlata, laPlataLive)
    expect(title).toBe("Lugares sin TACC en La Plata: mapa y guía")
    expect(h1).toBe("Lugares sin TACC en La Plata")
    expect(title).not.toContain("| CeliMap")
    expect(title.length).toBeLessThanOrEqual(60)
    expect(description).toBe(
      "Encontrá restaurantes, panaderías y cafés con opciones sin TACC en La Plata. Mapa colaborativo CeliMap para celíacos."
    )
    expect(description).not.toMatch(/verificado/i)
    expect(description).not.toMatch(/certificado/i)
    expect(description).not.toMatch(/100%\s*libres de gluten/i)
    expect(description).not.toMatch(/100%\s*seguro/i)
  })

  it("stats.total 0 no usa copy rico de inventario", () => {
    const title = getCityTitle(laPlata, { total: 0, dedicatedGf: 0, gfOptions: 0 })
    const description = getCityDescription(laPlata)
    expect(title).toBe("Lugares sin TACC en La Plata — Guía para celíacos")
    expect(title).not.toMatch(/Dónde comer/i)
    expect(description).toMatch(/Todavía no hay lugares aprobados/)
    expect(description).not.toContain("8")
    expect(description).not.toMatch(/mapa y recomendaciones/i)
  })

  it("Córdoba interpola sus números, no el 8 de La Plata", () => {
    const stats = { total: 12, dedicatedGf: 3, gfOptions: 4 }
    const title = getCityTitle(cordoba, stats)
    const description = getCityDescription(cordoba, stats)
    expect(title).toContain("Córdoba")
    expect(title).toMatch(/sin TACC/)
    expect(title).not.toContain("| CeliMap")
    expect(description).toContain("12")
    expect(description).toContain("3")
    expect(description).toContain("4")
    expect(description).not.toMatch(/(^|[^0-9])8([^0-9]|$)/)
    expect(description).not.toContain("La Plata")
  })

  it("ciudad de nombre largo no hereda copy de La Plata ni | CeliMap", () => {
    const smt = getCityBySlug("san-miguel-de-tucuman")!
    const stats = { total: 4, dedicatedGf: 1, gfOptions: 1 }
    const title = getCityTitle(smt, stats)
    expect(title).toContain("San Miguel de Tucumán")
    expect(title).toMatch(/sin TACC/)
    expect(title).not.toContain("| CeliMap")
    expect(title).not.toContain("La Plata")
    expect(title).not.toBe("Lugares sin TACC en La Plata: mapa y guía")
    expect(getCityH1(smt, stats)).toBe(title)
    expect(getCityDescription(smt, stats)).not.toContain("La Plata")
  })

  it("otras ciudades no separan H1 del title", () => {
    const stats = { total: 12, dedicatedGf: 3, gfOptions: 4 }
    expect(getCityH1(cordoba, stats)).toBe(getCityTitle(cordoba, stats))
  })
})

describe("T4 no toca indexación", () => {
  it("decideCityPageIndexing(0, rosario) sigue noindex", () => {
    expect(decideCityPageIndexing(0, "rosario")).toBe("noindex")
    expect(decideCityPageIndexing(0, "san-miguel-de-tucuman")).toBe("noindex")
  })
})

describe("P1 copy: Argentina, categorías nacionales y spokes", () => {
  const ba = getCityBySlug("buenos-aires")!
  const laPlata = getCityBySlug("la-plata")!
  const cordoba = getCityBySlug("cordoba")!

  it("hub nacional: title/H1 sin TACC; description pedida; sin | CeliMap", () => {
    expect(getArgentinaLandingTitle()).toBe("Lugares sin TACC en Argentina")
    expect(getArgentinaLandingTitle()).not.toContain("| CeliMap")
    expect(getArgentinaLandingDescription()).toBe(
      "Listado y mapa de lugares con opciones sin TACC en Argentina: restaurantes, panaderías, cafés y más. Datos de la comunidad CeliMap."
    )
    expect(getArgentinaLandingDescription()).not.toMatch(/100%\s*libres de gluten/i)
    expect(getArgentinaLandingDescription()).not.toMatch(/verificado/i)
  })

  it("restaurantes AR: title/H1/meta; cafés nacional no hereda override P2", () => {
    expect(getCategoryTitle(null, "restaurantes")).toBe("Restaurantes sin TACC en Argentina")
    expect(getCategoryH1(null, "restaurantes")).toBe("Restaurantes sin TACC en Argentina")
    expect(getCategoryDescription(null, "restaurantes")).toBe(
      "Encontrá restaurantes con opciones sin TACC / sin gluten en Argentina. Mapa y fichas colaborativas en CeliMap."
    )
    expect(getCategoryIntro(null, "restaurantes", 12)).toContain("12")
    expect(getCategoryTitle(null, "cafes")).toBe("Cafés sin gluten en Argentina")
    expect(getCategoryH1(null, "cafes")).toBe("Cafés sin gluten en Argentina")
  })

  it("panaderías AR: title/H1/meta", () => {
    expect(getCategoryTitle(null, "panaderias")).toBe("Panaderías sin TACC en Argentina")
    expect(getCategoryH1(null, "panaderias")).toBe("Panaderías sin TACC en Argentina")
    expect(getCategoryDescription(null, "panaderias")).toBe(
      "Panaderías con opciones sin TACC en Argentina. Explorá el mapa CeliMap y filtrá por ciudad."
    )
  })

  it("spoke CABA restaurantes: title con CABA+Buenos Aires; H1 CABA; slug en intro; sin path caba", () => {
    expect(getCategoryTitle(ba, "restaurantes")).toBe(
      "Restaurantes sin TACC en CABA (Buenos Aires)"
    )
    expect(getCategoryH1(ba, "restaurantes")).toBe("Restaurantes sin TACC en CABA")
    expect(getCategoryDescription(ba, "restaurantes")).toBe(
      "Restaurantes con opciones sin TACC en CABA. Fichas y mapa colaborativo CeliMap para celíacos en Buenos Aires."
    )
    const intro = getCategoryIntro(ba, "restaurantes", 9)
    expect(intro).toMatch(/slug buenos-aires/)
    expect(intro).not.toMatch(/\/caba/)
    expect(getCategoryTitle(ba, "restaurantes")).not.toContain("| CeliMap")
  })

  it("spoke La Plata panaderías descanibaliza vs hub; otras categorías de LP no cambian", () => {
    expect(getCategoryTitle(laPlata, "panaderias")).toBe("Panaderías sin TACC en La Plata")
    expect(getCategoryH1(laPlata, "panaderias")).toBe("Panaderías sin TACC en La Plata")
    expect(getCategoryDescription(laPlata, "panaderias")).toBe(
      "Panaderías con opciones sin TACC en La Plata. Listado y mapa en CeliMap, con datos de la comunidad."
    )
    expect(getCategoryIntro(laPlata, "panaderias", 4)).toContain("4")
    expect(getCategoryTitle(laPlata, "restaurantes")).toBe("Restaurantes sin gluten en La Plata")
    expect(getCityCategoryNavLabel("la-plata", "panaderias", "Panaderías sin gluten")).toBe(
      "Panaderías sin TACC en La Plata"
    )
    expect(getCityCategoryNavLabel("la-plata", "cafes", "Cafés sin gluten")).toBe("Cafés sin gluten")
  })

  it("otras ciudades/categorías no heredan copy CABA ni La Plata panadería", () => {
    expect(getCategoryTitle(cordoba, "restaurantes")).toBe("Restaurantes sin gluten en Córdoba")
    expect(getCategoryH1(cordoba, "restaurantes")).toBe(getCategoryTitle(cordoba, "restaurantes"))
    expect(getCategoryTitle(ba, "panaderias")).toBe("Panaderías sin gluten en Buenos Aires")
  })
})
