/**
 * @jest-environment node
 */
import {
  formatAddressTextFromFeature,
  type MapboxFeature,
} from "@/lib/mapboxGeocode"

describe("formatAddressTextFromFeature", () => {
  it("returns address when place_type is address", () => {
    const feature: MapboxFeature = {
      id: "1",
      place_name: "Thames 123, Palermo, CABA, Argentina",
      center: [-58.4, -34.6],
      place_type: ["address"],
      context: [
        { id: "neighborhood.123", text: "Palermo" },
        { id: "place.456", text: "Buenos Aires" },
      ],
    }
    const { addressText, needsUserInput } = formatAddressTextFromFeature(feature)
    expect(addressText).toBe("Thames 123, Palermo, CABA, Argentina")
    expect(needsUserInput).toBe(false)
  })

  it("returns poi format when place_type is poi", () => {
    const feature: MapboxFeature = {
      id: "2",
      place_name: "Plaza Italia, Palermo, Buenos Aires",
      center: [-58.4, -34.6],
      place_type: ["poi"],
      text: "Plaza Italia",
      context: [{ id: "neighborhood.123", text: "Palermo" }],
    }
    const { addressText, needsUserInput } = formatAddressTextFromFeature(feature)
    expect(addressText).toContain("Plaza Italia")
    expect(addressText).toContain("Palermo")
    expect(needsUserInput).toBe(false)
  })

  it("returns neighborhood/locality when place_type is neighborhood", () => {
    const feature: MapboxFeature = {
      id: "3",
      place_name: "Palermo, Buenos Aires, Argentina",
      center: [-58.4, -34.6],
      place_type: ["neighborhood"],
      context: [{ id: "neighborhood.123", text: "Palermo" }],
    }
    const { addressText, needsUserInput } = formatAddressTextFromFeature(feature)
    expect(addressText).toBeTruthy()
    expect(needsUserInput).toBe(false)
  })

  it("returns needsUserInput when feature is null", () => {
    const { addressText, needsUserInput } = formatAddressTextFromFeature(null)
    expect(addressText).toBe("")
    expect(needsUserInput).toBe(true)
  })

  it("returns needsUserInput when place_name is empty", () => {
    const feature: MapboxFeature = {
      id: "4",
      place_name: "",
      center: [-58.4, -34.6],
    }
    const { addressText, needsUserInput } = formatAddressTextFromFeature(feature)
    expect(addressText).toBe("")
    expect(needsUserInput).toBe(true)
  })

  it("returns place when place_type is place", () => {
    const feature: MapboxFeature = {
      id: "5",
      place_name: "Buenos Aires, Argentina",
      center: [-58.4, -34.6],
      place_type: ["place"],
    }
    const { addressText, needsUserInput } = formatAddressTextFromFeature(feature)
    expect(addressText).toBe("Buenos Aires, Argentina")
    expect(needsUserInput).toBe(false)
  })
})
