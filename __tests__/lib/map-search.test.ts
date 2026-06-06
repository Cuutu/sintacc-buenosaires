import { findKnownNeighborhoodSearch } from "@/lib/map-search"

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

  it("returns null for free-text searches", () => {
    expect(findKnownNeighborhoodSearch("panaderia recoleta")).toBeNull()
  })
})
