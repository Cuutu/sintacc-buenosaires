import {
  isGoogleMapsUrl,
  normalizeGoogleMapsUrl,
  parseGoogleMapsUrl,
} from "@/lib/place-research/resolve-maps-url"

describe("resolve Google Maps URLs", () => {
  it("detects maps short links", () => {
    expect(isGoogleMapsUrl("https://maps.app.goo.gl/ccf6jcdqfFHm77mP7")).toBe(true)
    expect(isGoogleMapsUrl("https://example.com/maps")).toBe(false)
  })

  it("normalizes maps URLs without protocol", () => {
    expect(normalizeGoogleMapsUrl("maps.app.goo.gl/ccf6jcdqfFHm77mP7")).toBe(
      "https://maps.app.goo.gl/ccf6jcdqfFHm77mP7"
    )
    expect(normalizeGoogleMapsUrl("https://example.com")).toBeNull()
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

  it("parses Búzios pin from expanded maps URL (not CABA)", () => {
    const parsed = parseGoogleMapsUrl(
      "https://www.google.com/maps/place/Alelhi+Restaurante+Sem+Gluten/@-22.7581446,-41.8951184,17z/data=!4m7!3m6!1s0x9655f50ebc8393:0x2eeb74cd1a36319a!8m2!3d-22.7581446!4d-41.8903548"
    )
    expect(parsed.placeName).toBe("Alelhi Restaurante Sem Gluten")
    expect(parsed.lat).toBeCloseTo(-22.7581446, 5)
    expect(parsed.lng).toBeCloseTo(-41.8903548, 5)
  })

  it("parses place_id from query params", () => {
    const parsed = parseGoogleMapsUrl(
      "https://www.google.com/maps/search/?api=1&query_place_id=ChIJN1t_tDeuEmsRUsoyG83frY4"
    )
    expect(parsed.placeId).toBe("ChIJN1t_tDeuEmsRUsoyG83frY4")
  })
})
