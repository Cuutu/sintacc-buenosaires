import { PUBLIC_PLACES_MAX_LIMIT, parsePublicPlacesSearchParams } from "@/lib/validations"

describe("PUBLIC_PLACES_MAX_LIMIT contract", () => {
  it("is documented map ceiling (5000), not legacy 100", () => {
    expect(PUBLIC_PLACES_MAX_LIMIT).toBe(5000)
  })

  it("clamps over-max limit", () => {
    const parsed = parsePublicPlacesSearchParams(
      new URLSearchParams(`limit=${PUBLIC_PLACES_MAX_LIMIT + 1}`)
    )
    expect(parsed.limit).toBe(PUBLIC_PLACES_MAX_LIMIT)
  })

  it("keeps within-max limit", () => {
    const parsed = parsePublicPlacesSearchParams(new URLSearchParams("limit=500"))
    expect(parsed.limit).toBe(500)
  })
})
