import {
  getFeaturedSecondaryTags,
  getSafetyDataConflict,
  resolvePrimarySafety,
} from "@/components/featured/featured-utils"

describe("resolvePrimarySafety", () => {
  it("prefers concrete safetyLevel over tags", () => {
    expect(
      resolvePrimarySafety({
        safetyLevel: "gf_options",
        tags: ["100_gf"],
      })
    ).toBe("gf_options")
  })

  it("infers dedicated_gf from tags when safetyLevel is unknown", () => {
    expect(
      resolvePrimarySafety({
        safetyLevel: "unknown",
        tags: ["100_gf"],
      })
    ).toBe("dedicated_gf")
  })

  it("infers dedicated_gf from certificado when field missing", () => {
    expect(
      resolvePrimarySafety({
        tags: ["certificado_sin_tacc", "cocina_separada"],
      })
    ).toBe("dedicated_gf")
  })

  it("returns unknown when no signal", () => {
    expect(resolvePrimarySafety({ safetyLevel: "unknown", tags: [] })).toBe("unknown")
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
})
