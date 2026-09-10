import { PUBLIC_PLACES_MAX_LIMIT, parsePublicPlacesSearchParams } from "@/lib/validations"

describe("PUBLIC_PLACES_MAX_LIMIT contract", () => {
  it("caps list requests at 100 so the catalog cannot dump in one shot", () => {
    expect(PUBLIC_PLACES_MAX_LIMIT).toBe(100)
  })

  it("clamps over-max limit", () => {
    const parsed = parsePublicPlacesSearchParams(
      new URLSearchParams(`limit=${PUBLIC_PLACES_MAX_LIMIT + 1}`)
    )
    expect(parsed.limit).toBe(PUBLIC_PLACES_MAX_LIMIT)
  })

  it("keeps within-max limit", () => {
    const parsed = parsePublicPlacesSearchParams(new URLSearchParams("limit=50"))
    expect(parsed.limit).toBe(50)
  })
})
