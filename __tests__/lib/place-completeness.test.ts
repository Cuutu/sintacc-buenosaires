import { completenessTone, hasUsableOpeningHours, placeCompleteness, placeQualityChecks } from "@/lib/place-completeness"
import { formatOpeningHours, parseOpeningHours } from "@/lib/opening-hours"

describe("place completeness", () => {
  it("cuenta foto, horarios, instagram, telefono, descripcion y coords", () => {
    expect(
      placeCompleteness({
        photos: ["https://img"],
        openingHours: "Lun 09:00–18:00",
        location: { lat: -34.5, lng: -58.4 },
        contact: { instagram: "@sintaxis", phone: "1140000000" },
        description: "Cocina 100% sin TACC.",
      })
    ).toBe(100)
    expect(placeCompleteness({ name: "X" })).toBe(0)
    expect(completenessTone(92)).toContain("#2D6A4F")
    expect(placeQualityChecks({ photos: ["https://img"] }).find((c) => c.id === "photo")?.ok).toBe(true)
  })
})

describe("opening hours", () => {
  it("serializa dias abiertos", () => {
    const week = parseOpeningHours("Lun 09:00–18:00 · Vie 10:00–20:00")
    expect(week.lun.closed).toBe(false)
    expect(week.mar.closed).toBe(true)
    expect(formatOpeningHours(week)).toContain("Lun 09:00–18:00")
  })
})

describe("horarios con todos los días cerrados", () => {
  const allClosed = Object.fromEntries(
    ["lun", "mar", "mie", "jue", "vie", "sab", "dom"].map((k) => [k, { ranges: [], closed: true, explicit: true }])
  ) as unknown as ReturnType<typeof parseOpeningHours>

  it("no cuentan como horarios cargados (antes decía Listo)", () => {
    const raw = formatOpeningHours(allClosed)
    expect(raw.trim()).not.toBe("")
    expect(hasUsableOpeningHours(raw)).toBe(false)
    expect(hasUsableOpeningHours("Lun–Dom cerrado")).toBe(false)
    expect(placeQualityChecks({ openingHours: raw }).find((c) => c.id === "hours")?.ok).toBe(false)
    expect(placeCompleteness({ openingHours: raw })).toBe(0)
  })

  it("con un día abierto, o texto libre, sí cuentan", () => {
    expect(hasUsableOpeningHours("Lun–Sáb cerrado; Dom 10:00–14:00")).toBe(true)
    expect(hasUsableOpeningHours("Lun–Vie 08:00–12:30 y 16:00–20:00; Sáb 08:00–12:00; Dom cerrado")).toBe(true)
    expect(hasUsableOpeningHours("Consultar por Instagram")).toBe(true)
    expect(hasUsableOpeningHours("")).toBe(false)
  })

  it("el ámbar de completitud media se lee sobre crema", () => {
    expect(completenessTone(67)).toContain("#8A5A00")
  })
})
