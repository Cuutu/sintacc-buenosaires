/**
 * @jest-environment node
 */
import { CARD_SAFETY_LABEL, cardSafetyFor, cardSafetyNote, cardTheme } from "@/lib/wallet/card-safety"

describe("etiqueta TACC de la tarjeta de sellos", () => {
  it("reads the same signal as the map, tags first", () => {
    expect(cardSafetyFor({ tags: ["100_gf"] })).toBe("dedicated")
    expect(cardSafetyFor({ tags: ["opciones_sin_tacc"] })).toBe("options")
    expect(cardSafetyFor({ safetyLevel: "dedicated_gf" })).toBe("dedicated")
    expect(cardSafetyFor({ safetyLevel: "gf_options" })).toBe("options")
    // Un tag de opciones le gana a un safetyLevel de 100%.
    expect(cardSafetyFor({ safetyLevel: "dedicated_gf", tags: ["opciones_sin_tacc"] })).toBe("options")
  })

  it("never turns a place into 100% on its own", () => {
    // Si tiene los dos tags, gana "con opciones".
    expect(cardSafetyFor({ tags: ["100_gf", "opciones_sin_tacc"] })).toBe("options")
    // Insumos certificados no es cocina dedicada.
    expect(cardSafetyFor({ tags: ["certificado_sin_tacc"] })).toBeNull()
  })

  it("shows no label without a clear signal", () => {
    expect(cardSafetyFor({})).toBeNull()
    expect(cardSafetyFor({ safetyLevel: "unknown", tags: ["sin_info"] })).toBeNull()
    expect(cardSafetyFor({ safetyLevel: "cross_contamination_risk" })).toBeNull()
  })

  it("paints the card like the map pins: olive for 100%, terracotta for options", () => {
    expect(cardTheme("dedicated").background).toBe("#2D4A34")
    expect(cardTheme(null).background).toBe("#2D4A34")
    expect(cardTheme("options").background).toBe("#A84A26")
  })

  it("uses the site's words and never promises", () => {
    expect(CARD_SAFETY_LABEL).toEqual({ dedicated: "100% sin TACC", options: "Con opciones sin TACC" })
    for (const safety of ["dedicated", "options"] as const) {
      expect(cardSafetyNote(safety)).toMatch(/^Según CeliMap/)
      expect(cardSafetyNote(safety)).not.toMatch(/seguro|garantiz|apto|verificad|certificad/i)
    }
  })
})
