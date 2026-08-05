import {
  decideProvinceCategoryIndexing,
  decideProvincePageIndexing,
  isProvinceCategoryIndexable,
  isProvincePageIndexable,
} from "@/lib/seo/indexing-rules"

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

  describe("helpers booleanos", () => {
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