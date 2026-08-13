import {
  inferGeoSearchCountry,
  googleAutocompleteLocationOptions,
  googleGeocodeQueryOptions,
  mapboxProximityParam,
  withGeoSearchSuffix,
} from "@/lib/geo-search-region"

describe("geo-search-region", () => {
  it("detects Brazil from Búzios / Brasil / rua", () => {
    expect(inferGeoSearchCountry("Alelhi Buzios")).toBe("br")
    expect(inferGeoSearchCountry("Restaurante, Búzios, Brasil")).toBe("br")
    expect(inferGeoSearchCountry("Rio de Janeiro")).toBe("br")
    expect(inferGeoSearchCountry("Rua das Pedras 55")).toBe("br")
  })

  it("detects Uruguay", () => {
    expect(inferGeoSearchCountry("Punta del Este, Uruguay")).toBe("uy")
  })

  it("does not restrict autocomplete to a country list", () => {
    expect(inferGeoSearchCountry("Palermo")).toBe("all")
    expect(
      "includedRegionCodes" in googleAutocompleteLocationOptions("Palermo")
    ).toBe(false)
    expect(googleGeocodeQueryOptions("Palermo").region).toBe("ar")
    expect(googleGeocodeQueryOptions("Buzios").region).toBe("br")
    expect(mapboxProximityParam("Búzios")).toContain("-43.17")
  })

  it("does not append Buenos Aires by default", () => {
    expect(withGeoSearchSuffix(["Alelhi", "Búzios"])).toBe("Alelhi Búzios Brasil")
    expect(withGeoSearchSuffix(["Café", "Palermo"])).toBe("Café Palermo")
  })
})
