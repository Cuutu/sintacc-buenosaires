import { syncAddressTextOnPatch } from "@/lib/place-location-patch"

describe("syncAddressTextOnPatch", () => {
  it("copia address a addressText si el admin no manda addressText", () => {
    expect(
      syncAddressTextOnPatch({
        address: "Int. Gorriti 3500, Moreno",
        location: { lat: -34.65, lng: -58.79 },
      })
    ).toEqual({
      address: "Int. Gorriti 3500, Moreno",
      location: { lat: -34.65, lng: -58.79 },
      addressText: "Int. Gorriti 3500, Moreno",
    })
  })

  it("respeta addressText explícito", () => {
    expect(
      syncAddressTextOnPatch({
        address: "Calle 1",
        addressText: "Calle 1, Moreno, Buenos Aires",
      })
    ).toEqual({
      address: "Calle 1",
      addressText: "Calle 1, Moreno, Buenos Aires",
    })
  })

  it("no inventa addressText si no hay address", () => {
    expect(syncAddressTextOnPatch({ name: "Panadería" })).toEqual({ name: "Panadería" })
  })
})
