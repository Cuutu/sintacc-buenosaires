import {
  isGoogleMapsUrl,
  parseGoogleMapsUrl,
} from "@/lib/place-research/resolve-maps-url"

describe("resolve Google Maps URLs", () => {
  it("detects maps short links", () => {
    expect(isGoogleMapsUrl("https://maps.app.goo.gl/ccf6jcdqfFHm77mP7")).toBe(true)
    expect(isGoogleMapsUrl("https://example.com/maps")).toBe(false)
  })

  it("parses place name and coordinates from a maps place URL", () => {
    const parsed = parseGoogleMapsUrl(
      "https://www.google.com/maps/place/Rochino+Pastas/@-34.618928,-58.4385361,14.5z/data=!4m6!3m5!1s0x95bccb5cdf209a6b:0xb21247bed93fbcc5!8m2!3d-34.6201304!4d-58.4314282!16s%2Fg%2F11tf3mfrvd"
    )

    expect(parsed.placeName).toBe("Rochino Pastas")
    expect(parsed.lat).toBeCloseTo(-34.6201304, 5)
    expect(parsed.lng).toBeCloseTo(-58.4314282, 5)
    expect(parsed.featureId).toBe("0x95bccb5cdf209a6b:0xb21247bed93fbcc5")
    expect(parsed.kgId).toBe("11tf3mfrvd")
  })

  it("parses place_id from query params", () => {
    const parsed = parseGoogleMapsUrl(
      "https://www.google.com/maps/search/?api=1&query_place_id=ChIJN1t_tDeuEmsRUsoyG83frY4"
    )
    expect(parsed.placeId).toBe("ChIJN1t_tDeuEmsRUsoyG83frY4")
  })
})
