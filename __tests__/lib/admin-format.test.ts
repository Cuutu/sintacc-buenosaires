import { formatCoordinate } from "@/lib/admin-format"
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
