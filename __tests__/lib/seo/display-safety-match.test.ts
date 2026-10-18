/**
 * @jest-environment node
 */
jest.mock("react", () => {
  const actual = jest.requireActual("react") as typeof import("react")
  return { ...actual, cache: (fn: unknown) => fn }
})

import { inferSafetyLevel } from "@/components/featured/featured-utils"
import { DISPLAY_DEDICATED_MATCH, DISPLAY_OPTIONS_MATCH } from "@/lib/seo/places"

type Doc = { tags?: string[]; safetyLevel?: string }

/** Evaluador mínimo de los operadores que usan esos filtros ($or, $and, $ne, $nin, igualdad en arrays). */
function matches(doc: Doc, query: Record<string, unknown>): boolean {
  return Object.entries(query).every(([key, cond]) => {
    if (key === "$or") return (cond as Record<string, unknown>[]).some((q) => matches(doc, q))
    if (key === "$and") return (cond as Record<string, unknown>[]).every((q) => matches(doc, q))
    const value = (doc as Record<string, unknown>)[key]
    const values = Array.isArray(value) ? value : value === undefined ? [] : [value]
    if (cond && typeof cond === "object") {
      const op = cond as { $ne?: unknown; $nin?: unknown[] }
      if ("$ne" in op) return !values.includes(op.$ne)
      if ("$nin" in op) return !values.some((v) => op.$nin!.includes(v))
      throw new Error(`operador no soportado en ${key}`)
    }
    return values.includes(cond)
  })
}

const TAG_SETS = [[], ["100_gf"], ["opciones_sin_tacc"], ["100_gf", "opciones_sin_tacc"], ["certificado_sin_tacc"], ["sin_info"]]
const LEVELS = [undefined, "dedicated_gf", "gf_options", "cross_contamination_risk", "unknown"]

describe("conteos de las landings = badges de los lugares", () => {
  for (const tags of TAG_SETS) {
    for (const safetyLevel of LEVELS) {
      const doc: Doc = { tags, ...(safetyLevel ? { safetyLevel } : {}) }
      const shown = inferSafetyLevel(doc as Parameters<typeof inferSafetyLevel>[0])
      it(`tags=${JSON.stringify(tags)} safetyLevel=${safetyLevel ?? "—"} → ${shown ?? "sin dato"}`, () => {
        expect(matches(doc, DISPLAY_DEDICATED_MATCH)).toBe(shown === "dedicated_gf")
        expect(matches(doc, DISPLAY_OPTIONS_MATCH)).toBe(shown === "gf_options")
      })
    }
  }

  it("un lugar con 100_gf y opciones_sin_tacc cuenta como opciones, nunca como 100%", () => {
    const doc = { tags: ["100_gf", "opciones_sin_tacc"], safetyLevel: "dedicated_gf" }
    expect(matches(doc, DISPLAY_DEDICATED_MATCH)).toBe(false)
    expect(matches(doc, DISPLAY_OPTIONS_MATCH)).toBe(true)
  })
})
