import { evaluateCityPageIndexability } from "@/lib/seo/city-index-quality"
import { CITY_INDEX_EXCEPTIONS } from "@/lib/seo/indexing-config"
import { decideCityPageIndexing } from "@/lib/seo/indexing-rules"

describe("city-index-quality", () => {
  it("0 lugares → noindex aunque sea excepción", () => {
    const r = evaluateCityPageIndexability({
      citySlug: "la-plata",
      totalPlaces: 0,
    })
    expect(r.decision).toBe("noindex")
    expect(r.reason).toBe("cero_lugares")
    expect(decideCityPageIndexing(0, "la-plata")).toBe("noindex")
  })

  it("excepción con 1 lugar + editorial → index", () => {
    const r = evaluateCityPageIndexability({
      citySlug: "san-miguel-de-tucuman",
      totalPlaces: 1,
    })
    expect(r.usedException).toBe(true)
    expect(r.hasEditorialContent).toBe(true)
    expect(r.decision).toBe("index")
    expect(r.reason).toBe("excepcion_con_calidad")
  })

  it("excepción thin sin editorial → noindex", () => {
    const r = evaluateCityPageIndexability({
      citySlug: "la-plata",
      totalPlaces: 1,
      hasValidGeography: true,
      hasEditorialContent: false,
    })
    expect(r.decision).toBe("noindex")
    expect(r.reason).toBe("contenido_insuficiente")
  })

  it("ciudad sin excepción con 1 lugar → noindex", () => {
    const r = evaluateCityPageIndexability({
      citySlug: "tandil",
      totalPlaces: 1,
    })
    expect(r.usedException).toBe(false)
    expect(r.decision).toBe("noindex")
  })

  it("ciudad sin excepción con ≥3 → index", () => {
    const r = evaluateCityPageIndexability({
      citySlug: "tandil",
      totalPlaces: 3,
    })
    expect(r.decision).toBe("index")
    expect(r.reason).toBe("umbral_general_con_calidad")
  })

  it("geo inválida → noindex", () => {
    const r = evaluateCityPageIndexability({
      citySlug: "ciudad-inventada",
      totalPlaces: 5,
      hasValidGeography: false,
      hasEditorialContent: true,
    })
    expect(r.decision).toBe("noindex")
    expect(r.reason).toBe("geo_invalida")
  })

  it("excepciones no incluyen ciudades solo-plan sin GSC", () => {
    const slugs = CITY_INDEX_EXCEPTIONS.map((e) => e.slug)
    expect(slugs).toEqual(["san-miguel-de-tucuman", "la-plata", "buenos-aires"])
    expect(slugs).not.toContain("yerba-buena")
    expect(CITY_INDEX_EXCEPTIONS.every((e) => e.minPlaces >= 1)).toBe(true)
  })
})
