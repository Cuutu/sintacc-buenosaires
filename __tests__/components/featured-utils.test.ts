import {
  getFeaturedSecondaryTags,
  getNonPrimarySafetyTags,
  getSafetyDataConflict,
  inferSafetyLevel,
  resolvePrimarySafety,
} from "@/components/featured/featured-utils"

describe("resolvePrimarySafety", () => {
  it("prefers tags over concrete safetyLevel", () => {
    expect(
      resolvePrimarySafety({
        safetyLevel: "dedicated_gf",
        tags: ["opciones_sin_tacc"],
      })
    ).toBe("gf_options")
  })

  it("opciones tag beats 100_gf tag (lugar con gluten)", () => {
    expect(
      resolvePrimarySafety({
        safetyLevel: "dedicated_gf",
        tags: ["100_gf", "opciones_sin_tacc"],
      })
    ).toBe("gf_options")
  })

  it("prefers 100_gf tag over gf_options field", () => {
    expect(
      resolvePrimarySafety({
        safetyLevel: "gf_options",
        tags: ["100_gf"],
      })
    ).toBe("dedicated_gf")
  })

  it("infers dedicated_gf from tags when safetyLevel is unknown", () => {
    expect(
      resolvePrimarySafety({
        safetyLevel: "unknown",
        tags: ["100_gf"],
      })
    ).toBe("dedicated_gf")
  })

  it("no trata certificado de materia prima como 100% GF (Growlers)", () => {
    expect(
      resolvePrimarySafety({
        safetyLevel: "dedicated_gf",
        tags: ["opciones_sin_tacc", "certificado_sin_tacc"],
      })
    ).toBe("gf_options")
    expect(
      resolvePrimarySafety({
        tags: ["certificado_sin_tacc", "cocina_separada"],
      })
    ).toBe("unknown")
  })

  it("falls back to safetyLevel when tags have no signal", () => {
    expect(
      resolvePrimarySafety({
        safetyLevel: "dedicated_gf",
        tags: ["cocina_separada"],
      })
    ).toBe("dedicated_gf")
  })

  it("returns unknown when no signal", () => {
    expect(resolvePrimarySafety({ safetyLevel: "unknown", tags: [] })).toBe("unknown")
  })
})

describe("inferSafetyLevel", () => {
  it("uses tag over wrong dedicated_gf field (Great Burgers case)", () => {
    expect(
      inferSafetyLevel({
        safetyLevel: "dedicated_gf",
        tags: ["opciones_sin_tacc"],
      })
    ).toBe("gf_options")
  })

  it("keeps safetyLevel when tags empty", () => {
    expect(
      inferSafetyLevel({
        safetyLevel: "dedicated_gf",
        tags: [],
      })
    ).toBe("dedicated_gf")
  })
})

describe("getNonPrimarySafetyTags", () => {
  it("drops 100_gf and opciones_sin_tacc", () => {
    expect(
      getNonPrimarySafetyTags([
        "100_gf",
        "opciones_sin_tacc",
        "certificado_sin_tacc",
        "cocina_separada",
      ])
    ).toEqual(["certificado_sin_tacc", "cocina_separada"])
  })
})

describe("getFeaturedSecondaryTags", () => {
  it("excludes primary safety tags and caps at 2 + extra", () => {
    const { chips, extraCount } = getFeaturedSecondaryTags(
      {
        _id: { toString: () => "1" },
        name: "Test",
        type: "restaurant",
        neighborhood: "Palermo",
        tags: ["100_gf", "certificado_sin_tacc", "cocina_separada", "sin_info"],
      },
      { includeNuevo: true }
    )
    expect(chips).toHaveLength(2)
    expect(chips[0]).toEqual({ kind: "nuevo" })
    expect(chips[1]).toEqual({ kind: "tag", tag: "certificado_sin_tacc" })
    expect(extraCount).toBe(1)
  })
})

describe("getSafetyDataConflict", () => {
  it("flags unknown field with positive tags (TACC Free Point case)", () => {
    const msg = getSafetyDataConflict({
      name: "TACC Free Point",
      safetyLevel: "unknown",
      tags: ["100_gf"],
    })
    expect(msg).toMatch(/TACC Free Point/)
    expect(msg).toMatch(/dedicated_gf/)
  })

  it("flags dedicated_gf with solo opciones tag", () => {
    const msg = getSafetyDataConflict({
      name: "Great Burgers",
      safetyLevel: "dedicated_gf",
      tags: ["opciones_sin_tacc"],
    })
    expect(msg).toMatch(/Great Burgers/)
    expect(msg).toMatch(/gf_options/)
  })
})
