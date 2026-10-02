/**
 * @jest-environment node
 */
import { parseMapTypeParam } from "@/lib/map-url-filters"
import { CATEGORY_SLUG_TO_TYPE } from "@/lib/seo/cities"

describe("parseMapTypeParam", () => {
  it("acepta el valor interno del tipo", () => {
    expect(parseMapTypeParam("restaurant")).toBe("restaurant")
    expect(parseMapTypeParam("icecream")).toBe("icecream")
  })

  it("acepta el slug en castellano y normaliza mayúsculas/espacios", () => {
    expect(parseMapTypeParam("restaurantes")).toBe("restaurant")
    expect(parseMapTypeParam(" Panaderias ")).toBe("bakery")
  })

  it("ignora valores vacíos o desconocidos", () => {
    expect(parseMapTypeParam(null)).toBeUndefined()
    expect(parseMapTypeParam("")).toBeUndefined()
    expect(parseMapTypeParam("all")).toBeUndefined()
    expect(parseMapTypeParam("<script>")).toBeUndefined()
  })

  it("cubre los mismos slugs que las landings SEO", () => {
    for (const [slug, type] of Object.entries(CATEGORY_SLUG_TO_TYPE)) {
      expect(parseMapTypeParam(slug)).toBe(type)
    }
  })
})
