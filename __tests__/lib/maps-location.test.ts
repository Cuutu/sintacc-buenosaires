import {
  isCountryOnlyAddress,
  isPlaceholderCabaLocation,
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
})
