/**
 * @jest-environment jsdom
 */
import {
  applyOnly100ToTags,
  isOnly100Tags,
  ONLY_100_STORAGE_KEY,
  readOnly100,
  refinePlacesBySafetyMode,
  SAFETY_MODE_EVENT,
  safetyModeFromTags,
  withSafetyMode,
  writeOnly100,
} from "@/lib/safety-mode"

describe("modo Sólo 100% sin TACC", () => {
  beforeEach(() => localStorage.clear())

  it("arranca apagado y se guarda en el dispositivo", () => {
    expect(readOnly100()).toBe(false)
    writeOnly100(true)
    expect(localStorage.getItem(ONLY_100_STORAGE_KEY)).toBe("1")
    expect(readOnly100()).toBe(true)
    writeOnly100(false)
    expect(localStorage.getItem(ONLY_100_STORAGE_KEY)).toBeNull()
    expect(readOnly100()).toBe(false)
  })

  it("avisa el cambio para sincronizar los otros controles", () => {
    const seen: unknown[] = []
    const onChange = (e: Event) => seen.push((e as CustomEvent).detail)
    window.addEventListener(SAFETY_MODE_EVENT, onChange)
    writeOnly100(true)
    window.removeEventListener(SAFETY_MODE_EVENT, onChange)
    expect(seen).toEqual([{ only100: true }])
  })

  it("aplica 100_gf sin pisar otros tags ni un filtro de seguridad ya elegido", () => {
    expect(applyOnly100ToTags([], false)).toEqual([])
    expect(applyOnly100ToTags(["delivery"], true)).toEqual(["delivery", "100_gf"])
    expect(applyOnly100ToTags(["opciones_sin_tacc"], true)).toEqual(["opciones_sin_tacc"])
    expect(applyOnly100ToTags(["100_gf"], true)).toEqual(["100_gf"])
  })

  it("sólo cuenta como modo 100% si el selector está en 100% (no en Con opciones)", () => {
    expect(isOnly100Tags(["100_gf"])).toBe(true)
    expect(isOnly100Tags(["100_gf", "delivery"])).toBe(true)
    expect(isOnly100Tags([])).toBe(false)
    expect(isOnly100Tags(["opciones_sin_tacc"])).toBe(false)
    expect(isOnly100Tags(["100_gf", "opciones_sin_tacc"])).toBe(false)
  })

  it("selector excluyente: lee y reemplaza el filtro de seguridad sin tocar otros tags", () => {
    expect(safetyModeFromTags([])).toBe("todos")
    expect(safetyModeFromTags(["100_gf", "delivery"])).toBe("cien")
    expect(safetyModeFromTags(["opciones_sin_tacc"])).toBe("opc")
    expect(safetyModeFromTags(["100_gf", "opciones_sin_tacc"])).toBe("todos")
    expect(withSafetyMode(["opciones_sin_tacc", "delivery"], "cien")).toEqual(["delivery", "100_gf"])
    expect(withSafetyMode(["100_gf", "cocina_separada"], "todos")).toEqual(["cocina_separada"])
  })

  it("en 100% saca los lugares que se muestran como Con opciones (tags mandan), sin reclasificar", () => {
    const places = [
      { id: "a", tags: ["100_gf"] },
      { id: "b", tags: ["100_gf", "opciones_sin_tacc"] },
      { id: "c", tags: [], safetyLevel: "dedicated_gf" as const },
      { id: "d", tags: ["opciones_sin_tacc"] },
    ]
    expect(refinePlacesBySafetyMode(places, "cien").map((p) => p.id)).toEqual(["a", "c"])
    expect(refinePlacesBySafetyMode(places, "opc").map((p) => p.id)).toEqual(["b", "d"])
    expect(refinePlacesBySafetyMode(places, "todos")).toBe(places)
  })
})
