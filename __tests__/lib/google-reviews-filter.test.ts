import {
  isDedicatedGlutenFreePlace,
} from "@/lib/google-reviews-filter"

describe("isDedicatedGlutenFreePlace", () => {
  it("detecta por safetyLevel dedicated_gf (selector 100% sin gluten)", () => {
    expect(isDedicatedGlutenFreePlace({ safetyLevel: "dedicated_gf" })).toBe(true)
  })

  it("detecta por tags sincronizados con el selector", () => {
    expect(isDedicatedGlutenFreePlace({ tags: ["100_gf"] })).toBe(true)
    expect(isDedicatedGlutenFreePlace({ tags: ["certificado_sin_tacc"] })).toBe(false)
  })

  it("no usa solo el nombre", () => {
    expect(isDedicatedGlutenFreePlace({ name: "Senza Tacc Palermo" })).toBe(false)
    expect(isDedicatedGlutenFreePlace({ name: "Panadería Sin Gluten" })).toBe(false)
  })

  it("no marca opciones / sin definir", () => {
    expect(isDedicatedGlutenFreePlace({ safetyLevel: "gf_options" })).toBe(false)
    expect(isDedicatedGlutenFreePlace({ safetyLevel: "unknown" })).toBe(false)
    expect(isDedicatedGlutenFreePlace({})).toBe(false)
    expect(
      isDedicatedGlutenFreePlace({
        safetyLevel: "dedicated_gf",
        tags: ["100_gf", "opciones_sin_tacc"],
      })
    ).toBe(false)
  })
})
