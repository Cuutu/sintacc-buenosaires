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

describe("dual-range opening hours (split daily hours)", () => {
  const GRANJA_VIAMONTE = "Lun-Viernes de 9.30 a 14 hs y de 17 a 20 hs. Sab. 9.30 a 14 hs."

  /** Martes 22 sep 2026 10:30 AR = 13:30 UTC */
  const TUESDAY_MORNING = new Date("2026-09-22T13:30:00.000Z")
  /** Martes 22 sep 2026 15:00 AR = 18:00 UTC */
  const TUESDAY_SIESTA = new Date("2026-09-22T18:00:00.000Z")
  /** Martes 22 sep 2026 18:26 AR = 21:26 UTC */
  const TUESDAY_EVENING = new Date("2026-09-22T21:26:00.000Z")
  /** Sábado 26 sep 2026 10:30 AR = 13:30 UTC */
  const SATURDAY_MORNING = new Date("2026-09-26T13:30:00.000Z")
  /** Sábado 26 sep 2026 15:00 AR = 18:00 UTC */
  const SATURDAY_AFTERNOON = new Date("2026-09-26T18:00:00.000Z")

  it("Tuesday morning 10:30 - open (first range 9.30-14)", () => {
    expect(isOpenNow(GRANJA_VIAMONTE, TUESDAY_MORNING)).toBe(true)
  })

  it("Tuesday siesta 15:00 - closed (between ranges)", () => {
    expect(isOpenNow(GRANJA_VIAMONTE, TUESDAY_SIESTA)).toBe(false)
  })

  it("Tuesday evening 18:26 - open (second range 17-20)", () => {
    expect(isOpenNow(GRANJA_VIAMONTE, TUESDAY_EVENING)).toBe(true)
  })

  it("Saturday morning 10:30 - open (after period splitting)", () => {
    expect(isOpenNow(GRANJA_VIAMONTE, SATURDAY_MORNING)).toBe(true)
  })

  it("Saturday afternoon 15:00 - closed (only one range for Sat)", () => {
    expect(isOpenNow(GRANJA_VIAMONTE, SATURDAY_AFTERNOON)).toBe(false)
  })

  it("shows correct close time for evening range", () => {
    expect(getOpenStatusLabel(GRANJA_VIAMONTE, TUESDAY_EVENING)).toBe("Cierra a las 20:00")
  })
})

describe("similar dual-range patterns", () => {
  it("handles 'y de' separator with different spacing", () => {
    const hours = "Lunes a Viernes de 8 a 13 y de 16 a 21"
    /** Lunes 21 sep 2026 17:00 AR = 20:00 UTC */
    const mondayEvening = new Date("2026-09-21T20:00:00.000Z")
    expect(isOpenNow(hours, mondayEvening)).toBe(true)
  })

  it("handles three ranges in one day", () => {
    const hours = "Viernes de 9 a 12 y de 15 a 18 y de 20 a 23"
    /** Viernes 25 sep 2026 21:00 AR = 00:00 UTC (sábado) */
    const fridayNight = new Date("2026-09-26T00:00:00.000Z")
    expect(isOpenNow(hours, fridayNight)).toBe(true)
  })
})

describe("getOpenStatusDetail", () => {
  const GRANJA_VIAMONTE = "Lun-Viernes de 9.30 a 14 hs y de 17 a 20 hs. Sab. 9.30 a 14 hs."
  
  /** Martes 22 sep 2026 15:00 AR = 18:00 UTC */
  const TUESDAY_SIESTA = new Date("2026-09-22T18:00:00.000Z")
  /** Martes 22 sep 2026 16:45 AR = 19:45 UTC */
  const TUESDAY_PRE_OPENING = new Date("2026-09-22T19:45:00.000Z")
  /** Martes 22 sep 2026 18:26 AR = 21:26 UTC */
  const TUESDAY_EVENING = new Date("2026-09-22T21:26:00.000Z")
  /** Martes 22 sep 2026 19:30 AR = 22:30 UTC */
  const TUESDAY_CLOSING_SOON = new Date("2026-09-22T22:30:00.000Z")
  /** Sábado 26 sep 2026 10:30 AR = 13:30 UTC */
  const SATURDAY_MORNING = new Date("2026-09-26T13:30:00.000Z")

  it("returns null for empty hours", () => {
    expect(import("@/lib/opening-hours").then((m) => m.getOpenStatusDetail(undefined))).resolves.toBeNull()
    expect(import("@/lib/opening-hours").then((m) => m.getOpenStatusDetail(""))).resolves.toBeNull()
  })

  it("closed during siesta shows 'abre en X min'", async () => {
    const { getOpenStatusDetail } = await import("@/lib/opening-hours")
    const detail = getOpenStatusDetail(GRANJA_VIAMONTE, TUESDAY_SIESTA)
    expect(detail).not.toBeNull()
    expect(detail!.isOpen).toBe(false)
    expect(detail!.label).toBe("Cerrado")
    expect(detail!.relativeText).toMatch(/abre en \d+ h/)
    expect(detail!.fullSchedule.length).toBeGreaterThan(0)
  })

  it("closed 15 min before opening shows exact time", async () => {
    const { getOpenStatusDetail } = await import("@/lib/opening-hours")
    const detail = getOpenStatusDetail(GRANJA_VIAMONTE, TUESDAY_PRE_OPENING)
    expect(detail).not.toBeNull()
    expect(detail!.isOpen).toBe(false)
    expect(detail!.label).toBe("Cerrado")
    expect(detail!.relativeText).toMatch(/abre en 15 min/)
  })

  it("open in evening window shows Abierto without relative time (not closing soon)", async () => {
    const { getOpenStatusDetail } = await import("@/lib/opening-hours")
    const detail = getOpenStatusDetail(GRANJA_VIAMONTE, TUESDAY_EVENING)
    expect(detail).not.toBeNull()
    expect(detail!.isOpen).toBe(true)
    expect(detail!.label).toBe("Abierto")
    expect(detail!.relativeText).toBeUndefined()
  })

  it("open and closing soon (30 min) shows 'cierra en X min'", async () => {
    const { getOpenStatusDetail } = await import("@/lib/opening-hours")
    const detail = getOpenStatusDetail(GRANJA_VIAMONTE, TUESDAY_CLOSING_SOON)
    expect(detail).not.toBeNull()
    expect(detail!.isOpen).toBe(true)
    expect(detail!.label).toBe("Abierto")
    expect(detail!.relativeText).toMatch(/cierra en 30 min/)
  })

  it("Saturday morning open shows status and full schedule", async () => {
    const { getOpenStatusDetail } = await import("@/lib/opening-hours")
    const detail = getOpenStatusDetail(GRANJA_VIAMONTE, SATURDAY_MORNING)
    expect(detail).not.toBeNull()
    expect(detail!.isOpen).toBe(true)
    expect(detail!.label).toBe("Abierto")
    expect(detail!.fullSchedule.length).toBeGreaterThan(0)
    const scheduleText = detail!.fullSchedule.join(" ")
    expect(scheduleText).toContain("Sab")
  })

  it("formats relative time naturally", async () => {
    const { getOpenStatusDetail } = await import("@/lib/opening-hours")
    const hours = "Lunes de 10 a 22"
    /** Lunes 21 sep 2026 09:00 AR = 12:00 UTC */
    const mondayMorning = new Date("2026-09-21T12:00:00.000Z")
    const detail = getOpenStatusDetail(hours, mondayMorning)
    expect(detail).not.toBeNull()
    expect(detail!.relativeText).toMatch(/abre en 1 h/)
  })

  it("handles multi-hour waits correctly", async () => {
    const { getOpenStatusDetail } = await import("@/lib/opening-hours")
    const hours = "Lunes de 17 a 22"
    /** Lunes 21 sep 2026 12:30 AR = 15:30 UTC */
    const mondayNoon = new Date("2026-09-21T15:30:00.000Z")
    const detail = getOpenStatusDetail(hours, mondayNoon)
    expect(detail).not.toBeNull()
    expect(detail!.relativeText).toMatch(/abre en 4 h 30 min/)
  })
})

describe("horarios reales de Google y manuales que antes fallaban", () => {
  const googleWeek = (value: string) =>
    ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]
      .map((day) => `${day}: ${value}`)
      .join("; ")

  /** Miércoles 30 sep 2026 14:00 AR = 17:00 UTC */
  const WEDNESDAY_2PM = new Date("2026-09-30T17:00:00.000Z")

  it("'Abierto las 24 horas' está abierto y no muestra cierre", () => {
    const hours = googleWeek("Abierto las 24 horas")
    expect(isOpenNow(hours, WEDNESDAY_2PM)).toBe(true)
    expect(getOpenStatusLabel(hours, WEDNESDAY_2PM)).toBe("Abierto ahora")
  })

  it("'Lunes - Abierto 24 horas' (carga manual) también", () => {
    expect(isOpenNow("Lunes - Abierto 24 horas\nDomingo - Abierto 24 horas", new Date("2026-09-28T15:00:00.000Z"))).toBe(true)
  })

  it("cierre después de medianoche: abierto de día y de madrugada del día siguiente", () => {
    const hours = googleWeek("7:00 a.m. – 12:30 a.m.")
    /** Viernes 2 oct 10:00 AR */
    expect(isOpenNow(hours, new Date("2026-10-02T13:00:00.000Z"))).toBe(true)
    /** Sábado 3 oct 00:15 AR: sigue abierto por el horario del viernes */
    expect(isOpenNow(hours, new Date("2026-10-03T03:15:00.000Z"))).toBe(true)
    /** Sábado 3 oct 02:00 AR: cerrado */
    expect(isOpenNow(hours, new Date("2026-10-03T05:00:00.000Z"))).toBe(false)
    expect(getOpenStatusLabel(hours, WEDNESDAY_2PM)).toBe("Cierra a las 0:30")
  })

  it("Google omite p.m. en la apertura: '7:00 – 11:00 p.m.' es de 19 a 23", () => {
    const hours =
      "lunes: 12:00 – 3:00 p.m., 7:00 – 11:00 p.m.; martes: Cerrado; miércoles: 12:00 – 3:00 p.m., 7:00 – 11:00 p.m."
    /** Miércoles 8:00 AR: cerrado (antes decía abierto desde las 7 am) */
    expect(isOpenNow(hours, new Date("2026-09-30T11:00:00.000Z"))).toBe(false)
    expect(isOpenNow(hours, WEDNESDAY_2PM)).toBe(true)
    /** Miércoles 20:00 AR */
    expect(isOpenNow(hours, new Date("2026-09-30T23:00:00.000Z"))).toBe(true)
  })

  it("el rango después de la coma no se aplica a los días cerrados", () => {
    const hours = "lunes: 12:00 – 3:00 p.m., 7:00 – 11:00 p.m.; martes: Cerrado"
    /** Martes 29 sep 20:00 AR */
    expect(isOpenNow(hours, new Date("2026-09-29T23:00:00.000Z"))).toBe(false)
  })

  it("'Lun-Sab 9 a 13, 18 a 21': la tarde es de Lun-Sab, no del domingo", () => {
    const hours = "Lun-Sab 9 a 13, 18 a 21"
    /** Sábado 3 oct 19:00 AR */
    expect(isOpenNow(hours, new Date("2026-10-03T22:00:00.000Z"))).toBe(true)
    /** Domingo 4 oct 19:00 AR */
    expect(isOpenNow(hours, new Date("2026-10-04T22:00:00.000Z"))).toBe(false)
  })

  it("rango de días con guion largo 'Lun–Sáb'", () => {
    /** Martes 29 sep 10:00 AR */
    expect(isOpenNow("Lun–Sáb 09:00–21:00; Dom 09:00–13:00", new Date("2026-09-29T13:00:00.000Z"))).toBe(true)
  })

  it("'Lunes - Cerrado' con texto después del guion", () => {
    /** Lunes 28 sep 12:00 AR */
    expect(isOpenNow("Lunes - Cerrado\nMartes - 10 a 18 horas", new Date("2026-09-28T15:00:00.000Z"))).toBe(false)
  })

  it("días separados por '·'", () => {
    /** Martes 29 sep 12:00 AR */
    expect(isOpenNow("Lun 10:00–21:00 · Mar 10:00–21:00", new Date("2026-09-29T15:00:00.000Z"))).toBe(true)
  })

  it("sin rango claro ('desde las 18 horas') no inventa Cerrado", () => {
    expect(isOpenNow("Lunes - desde las 18 horas\nMartes - desde las 18 horas", WEDNESDAY_2PM)).toBeNull()
  })

  it("una nota que menciona '24h' no vuelve el lugar 24/7", () => {
    const hours = "Lun–Vie 08:30–20:30; Dom cerrado (some platforms wrongly show 24h Sundays)."
    /** Domingo 4 oct 12:00 AR */
    expect(isOpenNow(hours, new Date("2026-10-04T15:00:00.000Z"))).toBe(false)
  })

  it("si falta más de un día para abrir, dice qué día", async () => {
    const { getOpenStatusDetail } = await import("@/lib/opening-hours")
    const hours = "lunes: Cerrado; martes: Cerrado; miércoles: 12:00 – 3:00 p.m."
    /** Lunes 28 sep 10:00 AR */
    const detail = getOpenStatusDetail(hours, new Date("2026-09-28T13:00:00.000Z"))
    expect(detail!.isOpen).toBe(false)
    expect(detail!.relativeText).toBe("abre el miércoles a las 12:00")
  })
})
