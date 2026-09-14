/**
 * @jest-environment node
 */
import { getOpenStatusLabel, isOpenNow, repairUtf8Mojibake, splitOpeningHoursLines } from "@/lib/opening-hours"

/** Viernes 14 ago 2026 15:21 en Argentina = 18:21 UTC */
const FRIDAY_AFTERNOON = new Date("2026-08-14T18:21:00.000Z")
/** Domingo 16 ago 2026 12:00 AR = 15:00 UTC */
const SUNDAY_NOON = new Date("2026-08-16T15:00:00.000Z")
/** Viernes 21:00 AR = sábado 00:00 UTC */
const FRIDAY_NIGHT = new Date("2026-08-15T00:00:00.000Z")

const MARTINEZ_HOURS = `Lunes - Viernes: 7.30 a 19.30 horas
Sábado: 8 a 19 horas
Domingo: Cerrado`

describe("isOpenNow", () => {
  it("no marca cerrado todo el texto solo porque Domingo dice Cerrado", () => {
    expect(isOpenNow(MARTINEZ_HOURS, FRIDAY_AFTERNOON)).toBe(true)
  })

  it("viernes de noche ya está cerrado", () => {
    expect(isOpenNow(MARTINEZ_HOURS, FRIDAY_NIGHT)).toBe(false)
  })

  it("domingo cerrado", () => {
    expect(isOpenNow(MARTINEZ_HOURS, SUNDAY_NOON)).toBe(false)
  })

  it("formato corto Lun-Vie sigue andando", () => {
    expect(isOpenNow("Lun-Vie 9-18, Sáb 10-14", FRIDAY_AFTERNOON)).toBe(true)
  })
})

describe("getOpenStatusLabel", () => {
  it("abierto muestra hora de cierre si se puede parsear", () => {
    expect(getOpenStatusLabel(MARTINEZ_HOURS, FRIDAY_AFTERNOON)).toBe("Cierra a las 19:30")
  })

  it("cerrado no inventa horario", () => {
    expect(getOpenStatusLabel(MARTINEZ_HOURS, SUNDAY_NOON)).toBe("Cerrado")
  })

  it("sin dato no muestra placeholder", () => {
    expect(getOpenStatusLabel(undefined)).toBeNull()
    expect(getOpenStatusLabel("")).toBeNull()
  })
})

describe("repairUtf8Mojibake", () => {
  it("arregla Miércoles y Sábado rotos", () => {
    expect(repairUtf8Mojibake("Mi\u00C3\u00A9rcoles")).toBe("Miércoles")
    expect(repairUtf8Mojibake("S\u00C3\u00A1bado")).toBe("Sábado")
    expect(repairUtf8Mojibake("Lunes - 8 a 20")).toBe("Lunes - 8 a 20")
  })
})

describe("splitOpeningHoursLines", () => {
  it("parte el bloque de días en líneas y repara encoding", () => {
    const raw =
      "Lunes - 8 a 20 horas Martes - 8 a 20 horas Mi\u00C3\u00A9rcoles - 8 a 20 horas Jueves - 8 a 20 horas"
    const lines = splitOpeningHoursLines(raw)
    expect(lines[0]).toBe("Lunes - 8 a 20 horas")
    expect(lines).toContain("Martes - 8 a 20 horas")
    expect(lines).toContain("Miércoles - 8 a 20 horas")
  })
})
