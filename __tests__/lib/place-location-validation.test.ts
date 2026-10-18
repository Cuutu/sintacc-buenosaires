/**
 * @jest-environment node
 */
import { placeDraftUpdateSchema, placeSchema } from "@/lib/validations"

const base = {
  name: "Los 36 Billares",
  type: "bar" as const,
  address: "Av. de Mayo 1271, CABA",
  neighborhood: "Monserrat",
}

describe("placeSchema location", () => {
  it("rechaza (0, 0)", () => {
    expect(placeSchema.safeParse({ ...base, location: { lat: 0, lng: 0 } }).success).toBe(false)
    expect(placeSchema.partial().safeParse({ location: { lat: 0, lng: 0 } }).success).toBe(false)
    expect(placeDraftUpdateSchema.safeParse({ location: { lat: 0, lng: 0 } }).success).toBe(false)
  })

  it("acepta coordenadas reales", () => {
    const parsed = placeSchema.parse({
      ...base,
      location: { lat: -34.6091049, lng: -58.3843784 },
    })
    expect(parsed.location).toEqual({ lat: -34.6091049, lng: -58.3843784 })
  })
})
