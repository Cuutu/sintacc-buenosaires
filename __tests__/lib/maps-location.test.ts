import {
  isCountryOnlyAddress,
  isNullIslandCoords,
  isPlaceholderCabaLocation,
  parseFormCoords,
  shouldReplaceDraftLocation,
} from "@/lib/place-research/maps-location"

describe("maps-location helpers", () => {
  it("detects Obelisco placeholder", () => {
    expect(
      isPlaceholderCabaLocation({ lat: -34.6037, lng: -58.3816 })
    ).toBe(true)
    expect(
      isPlaceholderCabaLocation({ lat: -22.7581446, lng: -41.8903548 })
    ).toBe(false)
    expect(isPlaceholderCabaLocation(null)).toBe(true)
  })

  it("treats country-only address as weak", () => {
    expect(isCountryOnlyAddress("Argentina")).toBe(true)
    expect(
      isCountryOnlyAddress("R. das Pedras, Armação dos Búzios, RJ, Brasil")
    ).toBe(false)
  })

  it("replaces placeholder location", () => {
    expect(shouldReplaceDraftLocation({ lat: -34.6037, lng: -58.3816 })).toBe(
      true
    )
    expect(
      shouldReplaceDraftLocation({ lat: -22.7581446, lng: -41.8903548 })
    ).toBe(false)
  })

  it("treats (0, 0) as missing coordinates", () => {
    expect(isNullIslandCoords(0, 0)).toBe(true)
    expect(isNullIslandCoords(-34.6, -58.4)).toBe(false)
    expect(parseFormCoords("0", "0")).toBeNull()
    expect(parseFormCoords(0, 0)).toBeNull()
    expect(parseFormCoords("-34.6091", "-58.3843")).toEqual({
      lat: -34.6091,
      lng: -58.3843,
    })
  })
})
