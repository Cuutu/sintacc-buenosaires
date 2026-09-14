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

const GOOGLE_HOURS = `lunes: 8:00 a.m. – 8:30 p.m.
martes: Cerrado
miércoles: 8:00 a.m. – 8:30 p.m.
jueves: 8:00 a.m. – 8:30 p.m.
viernes: 8:00 a.m. – 8:30 p.m.
sábado: 8:30 a.m. – 9:00 p.m.
domingo: 8:30 a.m. – 9:00 p.m.`

/** Lunes 14 sep 2026 19:09 AR = 22:09 UTC */
const MONDAY_EVENING = new Date("2026-09-14T22:09:00.000Z")
/** Martes 15 sep 2026 15:00 AR = 18:00 UTC */
const TUESDAY_AFTERNOON = new Date("2026-09-15T18:00:00.000Z")

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

  it("formato Google a.m./p.m. usa hora Argentina UTC-3", () => {
    expect(isOpenNow(GOOGLE_HOURS, MONDAY_EVENING)).toBe(true)
    expect(isOpenNow(GOOGLE_HOURS, TUESDAY_AFTERNOON)).toBe(false)
  })
})

describe("getOpenStatusLabel", () => {
  it("abierto muestra hora de cierre si se puede parsear", () => {
    expect(getOpenStatusLabel(MARTINEZ_HOURS, FRIDAY_AFTERNOON)).toBe("Cierra a las 19:30")
  })

  it("Google p.m. cierra a las 20:30 en UTC-3", () => {
    expect(getOpenStatusLabel(GOOGLE_HOURS, MONDAY_EVENING)).toBe("Cierra a las 20:30")
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
