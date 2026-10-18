/**
 * @jest-environment node
 */
import { boundingBox, findPlacesNear, haversineMeters } from "@/lib/places-near"

const mockFind = jest.fn()
jest.mock("@/models/Place", () => ({ Place: { find: (...args: unknown[]) => mockFind(...args) } }))

describe("places-near", () => {
  it("haversine: un grado de latitud son ~111 km", () => {
    expect(haversineMeters({ lat: -34, lng: -58 }, { lat: -35, lng: -58 })).toBeGreaterThan(110_000)
    expect(haversineMeters({ lat: -34, lng: -58 }, { lat: -35, lng: -58 })).toBeLessThan(112_000)
  })

  it("el rectángulo contiene el círculo del radio", () => {
    const origin = { lat: -31.4201, lng: -64.1888 }
    const box = boundingBox(origin.lat, origin.lng, 5000)
    expect(haversineMeters(origin, { lat: box.maxLat, lng: origin.lng })).toBeGreaterThanOrEqual(4990)
    expect(haversineMeters(origin, { lat: origin.lat, lng: box.maxLng })).toBeGreaterThanOrEqual(4990)
  })

  it("combina el filtro del que llama (p. ej. el del chat) con el rectángulo y pide location", async () => {
    mockFind.mockReturnValue({
      limit: () => ({
        lean: () =>
          Promise.resolve([
            { _id: "b", name: "B", location: { lat: -34.61, lng: -58.38 } },
            { _id: "a", name: "A", location: { lat: -34.6037, lng: -58.3817 } },
          ]),
      }),
    })
    const filter = { status: "approved", type: "cafe" }
    const near = await findPlacesNear<{ name: string; location?: { lat?: number; lng?: number } }>({
      lat: -34.6037,
      lng: -58.3816,
      radiusMeters: 2000,
      filter,
      projection: { name: 1 },
      limit: 12,
    })
    expect(near.map((p) => p.name)).toEqual(["A", "B"])
    const [query, projection] = mockFind.mock.calls[0]
    expect(query.$and[0]).toBe(filter)
    expect(query.$and[1]).toHaveProperty(["location.lat"])
    expect(projection).toEqual({ name: 1, location: 1 })
  })
})
