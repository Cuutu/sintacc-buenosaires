import { applyGeoToForm } from "@/lib/geocode"
import { parseFormCoords } from "@/lib/place-research/maps-location"

describe("form location helpers", () => {
  it("keeps real coords and ignores Obelisco placeholder", () => {
    expect(parseFormCoords("-22.758", "-41.890")).toEqual({
      lat: -22.758,
      lng: -41.89,
    })
    expect(parseFormCoords("-34.6037", "-58.3816")).toBeNull()
    expect(parseFormCoords("", "")).toBeNull()
  })

  it("fills incomplete address from Google result", () => {
    const next = applyGeoToForm(
      {
        address: "A completar - ver link",
        lat: "",
        lng: "",
        neighborhood: "A completar",
      },
      {
        address: "Rua das Pedras, Búzios",
        lat: -22.75,
        lng: -41.89,
        neighborhood: "Búzios",
      }
    )
    expect(next.address).toBe("Rua das Pedras, Búzios")
    expect(next.lat).toBe("-22.75")
    expect(next.neighborhood).toBe("Búzios")
  })

  it("does not overwrite a complete address", () => {
    const next = applyGeoToForm(
      {
        address: "Rua das Pedras 10",
        lat: "",
        lng: "",
        neighborhood: "Búzios",
      },
      {
        address: "Otro lado",
        lat: -22.75,
        lng: -41.89,
        neighborhood: "Rio",
      }
    )
    expect(next.address).toBe("Rua das Pedras 10")
    expect(next.neighborhood).toBe("Búzios")
    expect(next.lat).toBe("-22.75")
  })
})
