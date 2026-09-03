import { getCityBySlug } from "@/lib/seo/cities"
import { getCityTitle, getCityDescription } from "@/lib/seo/templates"
import { decideCityPageIndexing } from "@/lib/seo/indexing-rules"

const laPlata = getCityBySlug("la-plata")!
const cordoba = getCityBySlug("cordoba")!

describe("getCityTitle / getCityDescription", () => {
  const laPlataLive = { total: 8, dedicatedGf: 6, gfOptions: 2 }

  it("La Plata-like: title con sin TACC + ciudad; description interpola 8; sin verificado", () => {
    const title = getCityTitle(laPlata, laPlataLive)
    const description = getCityDescription(laPlata, laPlataLive)
    expect(title).toMatch(/sin TACC/)
    expect(title).toContain("La Plata")
    expect(title).not.toContain("| CeliMap")
    expect(title).not.toMatch(/mapa y recomendaciones/i)
    expect(title.length).toBeLessThanOrEqual(60)
    expect(description).toContain("8")
    expect(description).toContain("6")
    expect(description).toContain("2")
    expect(description).toMatch(/restaurantes/i)
    expect(description).toMatch(/panader/i)
    expect(description).toMatch(/caf/i)
    expect(description).toMatch(/según datos de CeliMap; confirmá en el local/)
    expect(description).not.toMatch(/verificado/i)
    expect(description).not.toMatch(/certificado/i)
    expect(description).not.toMatch(/100%\s*seguro/i)
    expect(description.length).toBeGreaterThanOrEqual(150)
    expect(description.length).toBeLessThanOrEqual(160)
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

  it("ciudad de nombre largo no mete | CeliMap y no usa if la-plata", () => {
    const smt = getCityBySlug("san-miguel-de-tucuman")!
    const title = getCityTitle(smt, { total: 4, dedicatedGf: 1, gfOptions: 1 })
    expect(title).toContain("San Miguel de Tucumán")
    expect(title).toMatch(/sin TACC/)
    expect(title).not.toContain("| CeliMap")
    expect(title).not.toContain("La Plata")
  })
})

describe("T4 no toca indexación", () => {
  it("decideCityPageIndexing(0, rosario) sigue noindex", () => {
    expect(decideCityPageIndexing(0, "rosario")).toBe("noindex")
    expect(decideCityPageIndexing(0, "san-miguel-de-tucuman")).toBe("noindex")
  })
})
