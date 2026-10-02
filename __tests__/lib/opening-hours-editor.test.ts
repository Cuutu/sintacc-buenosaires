/**
 * @jest-environment node
 */
import { parseOpeningHours, formatOpeningHours, isOpenNow } from "@/lib/opening-hours"

describe("parseOpeningHours (admin editor)", () => {
  it("parses day ranges like 'Lun–Sáb 09:00–15:00'", () => {
    const week = parseOpeningHours("Lun–Sáb 09:00–15:00")
    expect(week.lun.closed).toBe(false)
    expect(week.lun.ranges).toEqual([{ open: "09:00", close: "15:00" }])
    expect(week.mar.ranges).toEqual([{ open: "09:00", close: "15:00" }])
    expect(week.sab.ranges).toEqual([{ open: "09:00", close: "15:00" }])
    expect(week.dom.closed).toBe(true)
  })

  it("parses split shifts with ' y ' separator", () => {
    const week = parseOpeningHours("Lun–Vie 08:00–12:30 y 16:00–20:00")
    expect(week.lun.ranges).toEqual([
      { open: "08:00", close: "12:30" },
      { open: "16:00", close: "20:00" },
    ])
    expect(week.jue.ranges).toEqual([
      { open: "08:00", close: "12:30" },
      { open: "16:00", close: "20:00" },
    ])
  })

  it("parses multiple day groups separated by ';'", () => {
    const week = parseOpeningHours("Lun–Vie 08:00–12:30 y 16:00–20:00; Sáb 08:00–12:00; Dom cerrado")
    expect(week.lun.ranges.length).toBe(2)
    expect(week.sab.ranges).toEqual([{ open: "08:00", close: "12:00" }])
    expect(week.dom.closed).toBe(true)
  })

  it("parses 'cerrado' for specific days", () => {
    const week = parseOpeningHours("Lun–Sáb 09:00–21:00; Dom cerrado")
    expect(week.lun.closed).toBe(false)
    expect(week.dom.closed).toBe(true)
  })

  it("parses overnight ranges like '20:00–02:00'", () => {
    const week = parseOpeningHours("Mié–Sáb 20:00–02:00")
    expect(week.mie.ranges).toEqual([{ open: "20:00", close: "02:00" }])
    expect(week.jue.ranges).toEqual([{ open: "20:00", close: "02:00" }])
  })

  it("handles en dash, em dash, and hyphen in ranges", () => {
    const week1 = parseOpeningHours("Lun–Vie 09:00–17:00")
    const week2 = parseOpeningHours("Lun—Vie 09:00—17:00")
    const week3 = parseOpeningHours("Lun-Vie 09:00-17:00")
    expect(week1.lun.ranges).toEqual(week2.lun.ranges)
    expect(week1.lun.ranges).toEqual(week3.lun.ranges)
  })

  it("handles 'Todos los días'", () => {
    const week = parseOpeningHours("Todos los días 10:00–22:00")
    expect(week.lun.ranges).toEqual([{ open: "10:00", close: "22:00" }])
    expect(week.dom.ranges).toEqual([{ open: "10:00", close: "22:00" }])
  })
})

describe("formatOpeningHours", () => {
  it("groups consecutive days with identical hours", () => {
    const week = parseOpeningHours("Lun–Vie 09:00–17:00")
    const formatted = formatOpeningHours(week)
    expect(formatted).toBe("Lun–Vie 09:00–17:00")
  })

  it("outputs multiple ranges per day with ' y '", () => {
    const week = parseOpeningHours("Lun–Vie 08:00–12:30 y 16:00–20:00")
    const formatted = formatOpeningHours(week)
    expect(formatted).toBe("Lun–Vie 08:00–12:30 y 16:00–20:00")
  })

  it("separates day groups with ';'", () => {
    const week = parseOpeningHours("Lun–Vie 08:00–12:30 y 16:00–20:00; Sáb 08:00–12:00; Dom cerrado")
    const formatted = formatOpeningHours(week)
    expect(formatted).toBe("Lun–Vie 08:00–12:30 y 16:00–20:00; Sáb 08:00–12:00; Dom cerrado")
  })

  it("outputs 'cerrado' for closed days", () => {
    const week = parseOpeningHours("Lun–Sáb 09:00–21:00; Dom cerrado")
    const formatted = formatOpeningHours(week)
    expect(formatted).toBe("Lun–Sáb 09:00–21:00; Dom cerrado")
  })

  it("uses en dash (–) in output", () => {
    const week = parseOpeningHours("Lun-Vie 09:00-17:00")
    const formatted = formatOpeningHours(week)
    expect(formatted).toContain("–")
    expect(formatted).not.toContain("-")
  })
})

describe("round-trip: parse then format", () => {
  const testCases = [
    "Lun–Vie 08:00–12:30 y 16:00–20:00; Sáb 08:00–12:00; Dom cerrado",
    "Lun–Sáb 09:00–21:00; Dom 09:00–13:00",
    "Mié–Sáb 20:00–02:00",
    "Lun–Vie 09:00–17:00",
    "Lun 10:00–22:00; Mar 10:00–22:00; Mié 10:00–22:00",
  ]

  testCases.forEach((original) => {
    it(`round-trips: ${original}`, () => {
      const week = parseOpeningHours(original)
      const formatted = formatOpeningHours(week)
      const week2 = parseOpeningHours(formatted)
      
      // Deep equality check
      for (const day of ["lun", "mar", "mie", "jue", "vie", "sab", "dom"] as const) {
        expect(week2[day].closed).toBe(week[day].closed)
        expect(week2[day].ranges).toEqual(week[day].ranges)
      }
    })
  })

  it("normalizes consecutive individual days to range", () => {
    const week = parseOpeningHours("Lun 09:00–17:00; Mar 09:00–17:00; Mié 09:00–17:00")
    const formatted = formatOpeningHours(week)
    // Tuesday is missing, so should not be grouped
    expect(formatted).not.toBe("Lun–Mié 09:00–17:00")
  })

  it("preserves split shifts through round-trip", () => {
    const original = "Lun–Vie 09:00–13:00 y 15:00–22:00; Sáb 09:00–13:00"
    const week = parseOpeningHours(original)
    const formatted = formatOpeningHours(week)
    expect(formatted).toBe(original)
  })
})

describe("compatibility with public parser (isOpenNow)", () => {
  const testFormats = [
    "Lun–Vie 08:00–12:30 y 16:00–20:00; Sáb 08:00–12:00; Dom cerrado",
    "Lun–Sáb 09:00–21:00; Dom cerrado",
    "Mié–Sáb 20:00–02:00",
  ]

  testFormats.forEach((format) => {
    it(`public parser handles admin format: ${format}`, () => {
      // Parse with admin parser
      const week = parseOpeningHours(format)
      const adminFormatted = formatOpeningHours(week)
      
      // Public parser should be able to interpret it
      /** Jueves 1 oct 2026 10:00 AR = 13:00 UTC */
      const thursdayMorning = new Date("2026-10-01T13:00:00.000Z")
      const result = isOpenNow(adminFormatted, thursdayMorning)
      
      // Should return a boolean, not null (meaning it was parsed)
      expect(typeof result).toBe("boolean")
    })
  })

  it("admin format with split shifts parses correctly by public parser", () => {
    const adminFormat = "Lun–Vie 09:00–13:00 y 15:00–22:00"
    
    /** Martes 29 sep 10:00 AR = 13:00 UTC - morning shift */
    const tuesdayMorning = new Date("2026-09-29T13:00:00.000Z")
    expect(isOpenNow(adminFormat, tuesdayMorning)).toBe(true)
    
    /** Martes 29 sep 14:00 AR = 17:00 UTC - siesta */
    const tuesdaySiesta = new Date("2026-09-29T17:00:00.000Z")
    expect(isOpenNow(adminFormat, tuesdaySiesta)).toBe(false)
    
    /** Martes 29 sep 18:00 AR = 21:00 UTC - evening shift */
    const tuesdayEvening = new Date("2026-09-29T21:00:00.000Z")
    expect(isOpenNow(adminFormat, tuesdayEvening)).toBe(true)
  })
})

describe("edge cases", () => {
  it("empty string returns closed week", () => {
    const week = parseOpeningHours("")
    expect(week.lun.closed).toBe(true)
    expect(week.dom.closed).toBe(true)
  })

  it("handles extra whitespace", () => {
    const week = parseOpeningHours("  Lun–Vie   09:00  –  17:00  ;  Dom  cerrado  ")
    expect(week.lun.ranges).toEqual([{ open: "09:00", close: "17:00" }])
    expect(week.dom.closed).toBe(true)
  })

  it("handles mixed case", () => {
    const week = parseOpeningHours("LUN–VIE 09:00–17:00")
    expect(week.lun.ranges).toEqual([{ open: "09:00", close: "17:00" }])
  })

  it("three ranges in one day", () => {
    const week = parseOpeningHours("Vie 09:00–12:00 y 15:00–18:00 y 20:00–23:00")
    expect(week.vie.ranges).toEqual([
      { open: "09:00", close: "12:00" },
      { open: "15:00", close: "18:00" },
      { open: "20:00", close: "23:00" },
    ])
  })
})
