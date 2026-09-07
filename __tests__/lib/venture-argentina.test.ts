import { isArgentinaVentureZone, argentinaVentureMongoFilter } from "@/lib/venture-argentina"
import { VENTURE_ZONE_LANDINGS } from "@/lib/venture-seo"
import { BR_GEO_HINT } from "@/lib/geo-search-region"

describe("isArgentinaVentureZone", () => {
  it("excluye Búzios / Brasil (mismo helper geo que T6 geocoder)", () => {
    expect(isArgentinaVentureZone("Buzios")).toBe(false)
    expect(isArgentinaVentureZone("Búzios")).toBe(false)
    expect(isArgentinaVentureZone("Gastronomia, Brasil")).toBe(false)
  })

  it("incluye zonas AR típicas del feed", () => {
    expect(isArgentinaVentureZone("CABA")).toBe(true)
    expect(isArgentinaVentureZone("Monte Grande")).toBe(true)
    expect(isArgentinaVentureZone("Tierra del Fuego")).toBe(true)
    expect(isArgentinaVentureZone("Zarate")).toBe(true)
    expect(isArgentinaVentureZone("CABA, San Telmo.")).toBe(true)
  })

  it("zona vacía no se oculta (sin province en Venture)", () => {
    expect(isArgentinaVentureZone("")).toBe(true)
    expect(isArgentinaVentureZone(null)).toBe(true)
  })
})

describe("argentinaVentureMongoFilter", () => {
  it("reusa hints BR/UY, no un regex ad-hoc distinto", () => {
    const filter = argentinaVentureMongoFilter() as {
      $nor: Array<{ zone: { $regex: string } }>
    }
    expect(filter.$nor[0].zone.$regex).toBe(BR_GEO_HINT.source)
  })
})

describe("zone landing Buzios", () => {
  it("está marcada BR y no entra en landings AR", () => {
    const buzios = VENTURE_ZONE_LANDINGS.find((z) => z.slug === "buzios")
    expect(buzios?.countryCode).toBe("BR")
  })
})
