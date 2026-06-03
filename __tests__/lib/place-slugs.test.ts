import { buildPlaceSlug } from "@/lib/place-slugs"

describe("buildPlaceSlug", () => {
  it("builds a readable slug from place name and neighborhood", () => {
    expect(buildPlaceSlug("La Unión Gluten Free", "Caballito")).toBe(
      "la-union-gluten-free-caballito"
    )
  })

  it("removes punctuation and repeated separators", () => {
    expect(buildPlaceSlug("Café & Bakery!!!", "  Núñez  ")).toBe(
      "cafe-bakery-nunez"
    )
  })
})

