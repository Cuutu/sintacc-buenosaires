import type { IPlace } from "@/models/Place"
import { formatShortPlaceAddress, getPlaceRatingLine } from "@/components/map-view/place-selected-card-model"
import { buildPlacePopupHtml } from "@/components/map-view/map-popup-html"

function fakePlace(overrides: Partial<IPlace> = {}): IPlace {
  return {
    _id: "abc123",
    name: "La Cocina de Don Pablo",
    type: "restaurant",
    address: "Avenida Boedo 605, Almagro, CABA, C1234ABC, Argentina",
    addressText: "Avenida Boedo 605, Almagro, CABA, C1234ABC, Argentina",
    neighborhood: "Almagro",
    location: { lat: -34.62, lng: -58.42 },
    tags: ["opciones_sin_tacc"],
    photos: ["https://example.com/photo.jpg"],
    ...overrides,
  } as unknown as IPlace
}

describe("ficha seleccionada del mapa", () => {
  it("acorta dirección: sin CP ni país", () => {
    expect(formatShortPlaceAddress(fakePlace())).toBe("Avenida Boedo 605, Almagro")
  })

  it("rating Google en una línea", () => {
    const rating = getPlaceRatingLine(
      fakePlace({
        googleSnapshot: { rating: 4, userRatingCount: 101 },
      } as Partial<IPlace>)
    )
    expect(rating).toEqual({
      score: "4.0",
      source: "Google",
      countLabel: "(101 reseñas)",
    })
  })

  it("popup HTML compacto: sin imagen, badge, botones 48px", () => {
    const html = buildPlacePopupHtml(
      fakePlace({
        googleSnapshot: { rating: 4, userRatingCount: 101 },
      } as Partial<IPlace>)
    )
    expect(html).not.toContain("<img")
    expect(html).not.toContain("object-fit:cover")
    expect(html).toContain("Tiene opciones")
    expect(html).toContain("La Cocina de Don Pablo")
    expect(html).toContain("Restaurante • Almagro")
    expect(html).toContain("Avenida Boedo 605, Almagro")
    expect(html).toContain("Google")
    expect(html).toContain("Ver lugar")
    expect(html).toContain("Cómo llegar")
    expect(html).toContain("min-height:48px")
    expect(html).toContain("#F8F5EF")
    expect(html).toContain("#C85A2E")
    expect(html).toContain("#1F4D35")
  })
})
