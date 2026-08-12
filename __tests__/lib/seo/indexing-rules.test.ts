import {
  decideProvinceCategoryIndexing,
  decideProvincePageIndexing,
  decideCityPageIndexing,
  decideCityCategoryIndexing,
  decidePublicListIndexing,
  decideGuideIndexing,
  isProvinceCategoryIndexable,
  isProvincePageIndexable,
  isCityPageIndexable,
  isCityCategoryIndexable,
  isPublicListIndexable,
  isGuideIndexable,
  decisionToRobots,
} from "@/lib/seo/indexing-rules"
import {
  getCityMinPlaces,
  CITY_INDEX_EXCEPTIONS,
  INDEXING_THRESHOLDS,
} from "@/lib/seo/indexing-config"

describe("lib/seo/indexing-rules", () => {
  describe("decideProvincePageIndexing", () => {
    it("0 lugares → not_found", () => {
      expect(decideProvincePageIndexing(0, 0)).toBe("not_found")
    })

    it("1-4 lugares → noindex", () => {
      expect(decideProvincePageIndexing(1, 1)).toBe("noindex")
      expect(decideProvincePageIndexing(4, 2)).toBe("noindex")
    })

    it("5 lugares pero 1 localidad → noindex", () => {
      expect(decideProvincePageIndexing(5, 1)).toBe("noindex")
    })

    it("5 lugares y 2 localidades → index", () => {
      expect(decideProvincePageIndexing(5, 2)).toBe("index")
      expect(decideProvincePageIndexing(10, 3)).toBe("index")
    })
  })

  describe("decideProvinceCategoryIndexing", () => {
    it("0 resultados → not_found", () => {
      expect(decideProvinceCategoryIndexing(0)).toBe("not_found")
    })

    it("1-2 resultados → noindex", () => {
      expect(decideProvinceCategoryIndexing(1)).toBe("noindex")
      expect(decideProvinceCategoryIndexing(2)).toBe("noindex")
    })

    it("≥3 resultados → index", () => {
      expect(decideProvinceCategoryIndexing(3)).toBe("index")
      expect(decideProvinceCategoryIndexing(10)).toBe("index")
    })
  })

  describe("decideCityPageIndexing", () => {
    it("ciudad vacía → noindex", () => {
      expect(decideCityPageIndexing(0)).toBe("noindex")
      expect(isCityPageIndexable(0)).toBe(false)
    })

    it("ciudad con contenido insuficiente (general) → noindex", () => {
      expect(INDEXING_THRESHOLDS.cityMinPlaces).toBe(3)
      expect(decideCityPageIndexing(1)).toBe("noindex")
      expect(decideCityPageIndexing(2)).toBe("noindex")
      expect(isCityPageIndexable(2)).toBe(false)
    })

    it("ciudad con ≥3 lugares → index", () => {
      expect(decideCityPageIndexing(3)).toBe("index")
      expect(isCityPageIndexable(5)).toBe(true)
    })

    it("excepción estratégica: 1 lugar indexable", () => {
      expect(getCityMinPlaces("san-miguel-de-tucuman")).toBe(1)
      expect(getCityMinPlaces("la-plata")).toBe(1)
      expect(decideCityPageIndexing(1, "san-miguel-de-tucuman")).toBe("index")
      expect(decideCityPageIndexing(1, "la-plata")).toBe("index")
      expect(isCityPageIndexable(1, "buenos-aires")).toBe(true)
    })

    it("excepciones documentadas: Tucumán, La Plata, BA — no Yerba Buena", () => {
      const slugs = CITY_INDEX_EXCEPTIONS.map((e) => e.slug)
      expect(slugs).toContain("san-miguel-de-tucuman")
      expect(slugs).toContain("la-plata")
      expect(slugs).toContain("buenos-aires")
      expect(slugs).not.toContain("yerba-buena")
      expect(slugs).not.toContain("cordoba")
    })

    it("0 lugares nunca indexa aunque sea excepción", () => {
      expect(decideCityPageIndexing(0, "la-plata")).toBe("noindex")
    })
  })

  describe("decideCityCategoryIndexing", () => {
    it("0 → noindex; general necesita ≥2", () => {
      expect(decideCityCategoryIndexing(0)).toBe("noindex")
      expect(isCityCategoryIndexable(0)).toBe(false)
      expect(decideCityCategoryIndexing(1)).toBe("noindex")
      expect(decideCityCategoryIndexing(2)).toBe("index")
    })

    it("excepción estratégica permite 1", () => {
      expect(decideCityCategoryIndexing(1, "la-plata")).toBe("index")
      expect(isCityCategoryIndexable(1, "san-miguel-de-tucuman")).toBe(true)
    })
  })

  describe("decidePublicListIndexing", () => {
    it("privada → noindex", () => {
      expect(decidePublicListIndexing({ isPublic: false, placeCount: 10 })).toBe("noindex")
    })

    it("pública insuficiente → noindex", () => {
      expect(decidePublicListIndexing({ isPublic: true, placeCount: 2 })).toBe("noindex")
      expect(isPublicListIndexable(true, 2)).toBe(false)
    })

    it("pública ≥3 → index", () => {
      expect(decidePublicListIndexing({ isPublic: true, placeCount: 3 })).toBe("index")
      expect(isPublicListIndexable(true, 5)).toBe(true)
    })
  })

  describe("decideGuideIndexing", () => {
    it("draft → noindex; published → index", () => {
      expect(decideGuideIndexing("draft")).toBe("noindex")
      expect(isGuideIndexable("draft")).toBe(false)
      expect(decideGuideIndexing("published")).toBe("index")
      expect(isGuideIndexable("published")).toBe(true)
    })
  })

  describe("decisionToRobots", () => {
    it("mapea decisiones", () => {
      expect(decisionToRobots("index")).toBeUndefined()
      expect(decisionToRobots("noindex")).toEqual({ index: false, follow: true })
      expect(decisionToRobots("not_found")).toEqual({ index: false, follow: false })
    })
  })

  describe("helpers booleanos provincia", () => {
    it("isProvincePageIndexable", () => {
      expect(isProvincePageIndexable(5, 2)).toBe(true)
      expect(isProvincePageIndexable(5, 1)).toBe(false)
      expect(isProvincePageIndexable(4, 2)).toBe(false)
      expect(isProvincePageIndexable(0, 0)).toBe(false)
    })

    it("isProvinceCategoryIndexable", () => {
      expect(isProvinceCategoryIndexable(3)).toBe(true)
      expect(isProvinceCategoryIndexable(2)).toBe(false)
      expect(isProvinceCategoryIndexable(0)).toBe(false)
    })
  })
})
