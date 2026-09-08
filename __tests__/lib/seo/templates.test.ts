import { getCityBySlug } from "@/lib/seo/cities"
import { getCityTitle, getCityDescription, getCityH1 } from "@/lib/seo/templates"
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
