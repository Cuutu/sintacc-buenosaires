import {
  findKnownNeighborhoodSearch,
  getNeighborhoodSearchValues,
} from "@/lib/map-search"

describe("findKnownNeighborhoodSearch", () => {
  it("matches a known neighborhood case-insensitively", () => {
    expect(findKnownNeighborhoodSearch("recoleta")).toBe("Recoleta")
  })

  it("ignores surrounding whitespace", () => {
    expect(findKnownNeighborhoodSearch("  Recoleta  ")).toBe("Recoleta")
  })

  it("matches neighborhoods without requiring accents", () => {
    expect(findKnownNeighborhoodSearch("Cordoba")).toBe("Córdoba")
  })

  it("maps known neighborhood aliases to their canonical neighborhood", () => {
    expect(findKnownNeighborhoodSearch("Barrio Norte")).toBe("Recoleta")
    expect(getNeighborhoodSearchValues("Recoleta")).toEqual(
      expect.arrayContaining(["Recoleta", "Barrio Norte", "La Isla"])
    )
  })

  it("returns null for free-text searches", () => {
    expect(findKnownNeighborhoodSearch("panaderia recoleta")).toBeNull()
  })
})
