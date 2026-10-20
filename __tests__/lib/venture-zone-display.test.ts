/**
 * @jest-environment node
 */
import { formatVentureZone } from "@/lib/venture-zone-display"

describe("formatVentureZone", () => {
  it.each([
    ["Caba", "CABA"],
    ["caba", "CABA"],
    ["Palermo, Caba", "Palermo, CABA"],
    ["C.A.B.A.", "CABA"],
    ["Caba · GBA Norte", "CABA · GBA Norte"],
    ["Córdoba", "Córdoba"],
    ["Cabaña", "Cabaña"],
    ["  ", ""],
  ])("%s → %s", (raw, expected) => {
    expect(formatVentureZone(raw)).toBe(expected)
  })

  it("acepta vacío", () => {
    expect(formatVentureZone(undefined)).toBe("")
    expect(formatVentureZone(null)).toBe("")
  })
})
