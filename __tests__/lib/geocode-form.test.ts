import { applyGeoToForm, formLocationSource } from "@/lib/geocode"
import { parseFormCoords, readPlaceCoords } from "@/lib/place-research/maps-location"

describe("form location helpers", () => {
  it("keeps real coords and ignores Obelisco placeholder", () => {
    expect(parseFormCoords("-22.758", "-41.890")).toEqual({
      lat: -22.758,
      lng: -41.89,
    })
    expect(parseFormCoords("-34.6037", "-58.3816")).toBeNull()
    expect(parseFormCoords("", "")).toBeNull()
  })

  it("lee coords {lat,lng} y GeoJSON Point", () => {
    expect(readPlaceCoords({ lat: -34.65, lng: -58.79 })).toEqual({ lat: -34.65, lng: -58.79 })
    expect(readPlaceCoords({ type: "Point", coordinates: [-58.79, -34.65] })).toEqual({
      lat: -34.65,
      lng: -58.79,
    })
    expect(readPlaceCoords(null)).toBeNull()
  })

  it("no deja que el link Maps del contacto pise un pin ya elegido", () => {
    expect(
      formLocationSource({
        address: "Int. Gorriti 3500, Moreno",
        lat: "-34.65",
        lng: "-58.79",
        mapsUrl: "https://maps.app.goo.gl/HrvWSntqH5rFTmJY6",
      })
    ).toBe("coords")
    expect(
      formLocationSource({
        address: "https://maps.app.goo.gl/HrvWSntqH5rFTmJY6",
        lat: "",
        lng: "",
      })
    ).toBe("address-maps")
    expect(
      formLocationSource({
        address: "A completar",
        lat: "",
        lng: "",
        mapsUrl: "https://maps.app.goo.gl/HrvWSntqH5rFTmJY6",
      })
    ).toBe("contact-maps")
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
