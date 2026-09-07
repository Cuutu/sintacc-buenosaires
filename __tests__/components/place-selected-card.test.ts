import type { IPlace } from "@/models/Place"
import { formatShortPlaceAddress, getPlaceSheetDetailTags } from "@/components/map-view/place-selected-card-model"
import { buildPlacePopupHtml } from "@/components/map-view/map-popup-html"
import { getPlaceReviewLines } from "@/lib/place-review-display"

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

  it("rating Google en una línea etiquetada, empty CeliMap al lado", () => {
    const lines = getPlaceReviewLines(
      fakePlace({
        googleSnapshot: { rating: 4, userRatingCount: 101 },
      } as Partial<IPlace>)
    )
    expect(lines.map((line) => line.text)).toEqual([
      "Google 4.0 · 101 reseñas",
      "Todavía no hay reseñas de la comunidad",
    ])
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
    expect(html).toContain("Google 4.0 · 101 reseñas")
    expect(html).toContain("Todavía no hay reseñas de la comunidad")
    expect(html).not.toContain("Todavía no hay reseñas</")
    expect(html).toContain("Ver lugar")
    expect(html).toContain("Cómo llegar")
    expect(html).toContain("min-height:48px")
    expect(html).toContain("#F8F5EF")
    expect(html).toContain("#C85A2E")
    expect(html).toContain("#1F4D35")
  })

  it("sheet solo cocina_separada y certificado, en ese orden", () => {
    expect(
      getPlaceSheetDetailTags([
        "100_gf",
        "certificado_sin_tacc",
        "sin_info",
        "cocina_separada",
        "opciones_sin_tacc",
      ]).map((tag) => tag.id)
    ).toEqual(["cocina_separada", "certificado_sin_tacc"])
    expect(getPlaceSheetDetailTags(["100_gf", "opciones_sin_tacc"])).toEqual([])
    expect(getPlaceSheetDetailTags(["certificado_sin_tacc"])).toEqual([
      { id: "certificado_sin_tacc", label: "Insumos certificados" },
    ])
  })
})
