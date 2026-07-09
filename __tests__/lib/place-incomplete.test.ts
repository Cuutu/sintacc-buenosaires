import { isPlaceInformationIncomplete, countMissingEnrichmentFields } from "@/lib/place-incomplete"

describe("place incomplete detection", () => {
  it("flags place with only name and address", () => {
    expect(
      isPlaceInformationIncomplete({
        name: "Rochino Pastas",
        address: "Av. Corrientes 1234",
        neighborhood: "Almagro",
        type: "other",
      })
    ).toBe(true)
  })

  it("accepts place with enough enrichment", () => {
    expect(
      isPlaceInformationIncomplete({
        name: "Rochino Pastas",
        address: "Av. Corrientes 1234",
        neighborhood: "Almagro",
        type: "bakery",
        contact: { instagram: "@rochino" },
        openingHours: "Lun-Sab 9-20",
        safetyLevel: "gf_options",
      })
    ).toBe(false)
  })

  it("lists missing enrichment fields", () => {
    expect(
      countMissingEnrichmentFields({
        name: "Test",
        address: "Calle 1",
        neighborhood: "Palermo",
        type: "other",
      })
    ).toEqual(expect.arrayContaining(["contacto", "horarios", "fotos", "clasificación TACC"]))
  })
})
