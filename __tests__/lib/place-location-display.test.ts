import {
  formatFullPlaceAddress,
  formatShortPlaceAddress,
  getCanonicalPlaceArea,
} from "@/lib/place-location-display"

const newLife = {
  name: "New Life Gluten Free",
  address: "Gral. Belgrano 294, B2804 Campana, Provincia de Buenos Aires, Argentina",
  addressText: "Gral. Belgrano 294, B2804 Campana, Provincia de Buenos Aires, Argentina",
  neighborhood: "Belgrano",
  locality: "campana",
  province: "buenos-aires",
  location: { lat: -34.163, lng: -58.959 },
}

const almagro = {
  name: "La Cocina de Don Pablo",
  address: "Avenida Boedo 605, Almagro, CABA, C1234ABC, Argentina",
  addressText: "Avenida Boedo 605, Almagro, CABA, C1234ABC, Argentina",
  neighborhood: "Almagro",
  locality: "buenos-aires",
  province: "caba",
  location: { lat: -34.62, lng: -58.42 },
}

describe("dirección canónica", () => {
  it("New Life: no usa barrio CABA Belgrano si la ciudad es Campana", () => {
    expect(getCanonicalPlaceArea(newLife)).toBe("Campana")
    expect(formatShortPlaceAddress(newLife)).toBe("Gral. Belgrano 294, Campana")
    expect(formatFullPlaceAddress(newLife)).toBe(
      "Gral. Belgrano 294, B2804 Campana, Provincia de Buenos Aires"
    )
    expect(formatShortPlaceAddress(newLife)).not.toMatch(/Belgrano$/)
    expect(formatFullPlaceAddress(newLife)).not.toContain(", Belgrano")
  })

  it("coords fuera de CABA + barrio CABA: descarta el barrio aunque el address lo repita", () => {
    const streetOnly = {
      ...newLife,
      locality: "",
      address: "Gral. Belgrano 294, Belgrano",
      addressText: "Gral. Belgrano 294, Belgrano",
    }
    expect(getCanonicalPlaceArea(streetOnly)).toBe("")
    expect(formatShortPlaceAddress(streetOnly)).toBe("Gral. Belgrano 294")
  })

  it("Almagro CABA sigue mostrando el barrio", () => {
    expect(getCanonicalPlaceArea(almagro)).toBe("Almagro")
    expect(formatShortPlaceAddress(almagro)).toBe("Avenida Boedo 605, Almagro")
    expect(formatFullPlaceAddress(almagro)).toContain("Almagro")
    expect(formatFullPlaceAddress(almagro)).toContain("CABA")
  })
})
