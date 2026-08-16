import { completenessTone, placeCompleteness, placeQualityChecks } from "@/lib/place-completeness"
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
