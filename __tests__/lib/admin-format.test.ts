import { formatAdminDate, formatAdminDateTime, formatCoordinate, formatCount } from "@/lib/admin-format"
import { formatLocalityName } from "@/lib/place-location-display"

describe("formatCoordinate", () => {
  it("redondea a 6 decimales sin ruido de float", () => {
    expect(formatCoordinate(-58.55315150000001)).toBe("-58.553152")
    expect(formatCoordinate(-34.6)).toBe("-34.6")
    expect(formatCoordinate("-34.60372211111")).toBe("-34.603722")
  })

  it("vacío si no es un número", () => {
    expect(formatCoordinate(undefined)).toBe("")
    expect(formatCoordinate(NaN)).toBe("")
    expect(formatCoordinate("")).toBe("")
    expect(formatCoordinate("abc")).toBe("")
  })
})

describe("formatLocalityName", () => {
  it("muestra siempre el nombre, nunca el slug", () => {
    expect(formatLocalityName("tandil")).toBe("Tandil")
    expect(formatLocalityName("Tandil")).toBe("Tandil")
    expect(formatLocalityName("tres-arroyos")).toBe("Tres Arroyos")
    expect(formatLocalityName("concepcion-del-uruguay")).toBe("Concepcion del Uruguay")
    expect(formatLocalityName("mar del plata")).toBe("Mar del Plata")
    expect(formatLocalityName("San Carlos de Bariloche")).toBe("San Carlos de Bariloche")
    expect(formatLocalityName("")).toBe("")
    expect(formatLocalityName(undefined)).toBe("")
  })
})

describe("formatCount", () => {
  it("usa punto de miles", () => {
    expect(formatCount(2451)).toBe("2.451")
    expect(formatCount(1830)).toBe("1.830")
    expect(formatCount(5)).toBe("5")
    expect(formatCount(1234567)).toBe("1.234.567")
  })
})

describe("formatAdminDate", () => {
  const now = new Date("2026-10-21T15:00:00Z")
  it("un solo formato: día y mes, con año si no es este", () => {
    expect(formatAdminDate("2026-10-11T15:00:00Z", now)).toMatch(/^11 oct$/)
    expect(formatAdminDate("2025-10-11T15:00:00Z", now)).toMatch(/^11 oct 2025$/)
    expect(formatAdminDate(undefined, now)).toBe("—")
    expect(formatAdminDate("no es fecha", now)).toBe("—")
  })

  it("en hora de Argentina (00:30 UTC del 12 es el 11 a la noche)", () => {
    expect(formatAdminDate("2026-10-12T00:30:00Z", now)).toMatch(/^11 oct$/)
    expect(formatAdminDateTime("2026-10-12T00:30:00Z", now)).toMatch(/^11 oct, 21:30$/)
  })
})
