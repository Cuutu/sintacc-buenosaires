import {
  countMissingConcreteFields,
  getEffectiveSafetyLevel,
  hasTaccClassification,
  isPlaceEnrichmentReviewCandidate,
  isPlaceInformationIncomplete,
  isPlaceMissingTaccClassification,
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

  it("detects TACC from safetyLevel", () => {
    expect(
      hasTaccClassification({
        safetyLevel: "gf_options",
        tags: [],
      })
    ).toBe(true)
    expect(isPlaceMissingTaccClassification({ safetyLevel: "gf_options" })).toBe(false)
  })

  it("detects TACC from opciones_sin_tacc tag when safetyLevel empty", () => {
    const place = {
      name: "Lo de Carlitos",
      address: "Calle 1",
      neighborhood: "Monte Grande",
      type: "restaurant" as const,
      safetyLevel: undefined,
      tags: ["opciones_sin_tacc", "cocina_separada"],
      photos: [] as string[],
    }

    expect(hasTaccClassification(place)).toBe(true)
    expect(isPlaceEnrichmentReviewCandidate(place)).toBe(false)
    expect(countMissingConcreteFields(place)).toEqual([])
  })

  it("opciones tag beats dedicated_gf field", () => {
    expect(
      getEffectiveSafetyLevel({
        safetyLevel: "dedicated_gf",
        tags: ["100_gf", "opciones_sin_tacc"],
      })
    ).toBe("gf_options")
  })

  it("lists only TACC when unclassified", () => {
    expect(
      countMissingConcreteFields({
        name: "Test",
        address: "Calle 1",
        neighborhood: "Palermo",
        type: "other",
        photos: [],
      })
    ).toEqual(["clasificación TACC"])
  })

  it("excludes classified place even without photos", () => {
    const place = {
      name: "Cafe GF",
      address: "Calle 1",
      neighborhood: "Palermo",
      type: "cafe" as const,
      safetyLevel: "dedicated_gf" as const,
      photos: [] as string[],
      aiEnrichment: { status: "done" },
    }

    expect(isPlaceEnrichmentReviewCandidate(place)).toBe(false)
  })
})
