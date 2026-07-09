import {
  countMissingConcreteFields,
  countMissingEnrichmentFields,
  isPlaceEnrichmentReviewCandidate,
  isPlaceInformationIncomplete,
  isPlaceMissingConcreteInformation,
} from "@/lib/place-incomplete"

describe("place incomplete detection", () => {
  it("flags place with only name and address", () => {
    expect(
      isPlaceInformationIncomplete({
        name: "Rochino Pastas",
        address: "Av. Corrientes 1234",
        neighborhood: "Almagro",
        type: "other",
        photos: [],
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
        photos: [],
      })
    ).toBe(false)
  })

  it("lists missing concrete fields without photos", () => {
    expect(
      countMissingConcreteFields({
        name: "Test",
        address: "Calle 1",
        neighborhood: "Palermo",
        type: "other",
        photos: [],
      })
    ).toEqual(
      expect.arrayContaining(["contacto", "horarios", "clasificación TACC", "tipo"])
    )
    expect(countMissingConcreteFields({
      name: "Test",
      address: "Calle 1",
      neighborhood: "Palermo",
      type: "other",
      photos: [],
    })).not.toContain("fotos")
  })

  it("excludes place that only lacks photos from review list", () => {
    const place = {
      name: "Cafe GF",
      address: "Calle 1",
      neighborhood: "Palermo",
      type: "cafe" as const,
      contact: { instagram: "@cafe" },
      openingHours: "9-18",
      safetyLevel: "gf_options" as const,
      photos: [] as string[],
      aiEnrichment: { status: "done" },
    }

    expect(isPlaceMissingConcreteInformation(place)).toBe(false)
    expect(isPlaceEnrichmentReviewCandidate(place)).toBe(false)
    expect(countMissingEnrichmentFields(place)).toEqual([])
  })

  it("includes place missing TACC classification", () => {
    const place = {
      name: "Cafe",
      address: "Calle 1",
      neighborhood: "Palermo",
      type: "cafe" as const,
      contact: { instagram: "@cafe" },
      openingHours: "9-18",
      photos: ["https://example.com/1.jpg"],
      aiEnrichment: { status: "done" },
    }

    expect(isPlaceEnrichmentReviewCandidate(place)).toBe(true)
    expect(countMissingConcreteFields(place)).toContain("clasificación TACC")
  })
})
