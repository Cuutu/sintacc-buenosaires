/**
 * @jest-environment node
 */
import { NextRequest } from "next/server"
import { GET } from "@/app/api/places/near/route"

const mockFind = jest.fn()
const mockAggregate = jest.fn()
jest.mock("@/lib/mongodb", () => jest.fn(() => Promise.resolve()))
jest.mock("@/lib/public-read-limit", () => ({ enforcePublicReadRateLimit: jest.fn().mockResolvedValue(null) }))
jest.mock("@/lib/logger", () => ({ logApiError: jest.fn() }))
jest.mock("@/models/Place", () => ({
  Place: {
    find: (...args: unknown[]) => mockFind(...args),
    aggregate: (...args: unknown[]) => mockAggregate(...args),
  },
}))

// Obelisco y alrededores. 0,001° de latitud ≈ 111 m.
const ORIGIN = { lat: -34.6037, lng: -58.3816 }
const place = (id: string, dLat: number, dLng = 0, extra: Record<string, unknown> = {}) => ({
  _id: id,
  name: `Lugar ${id}`,
  slug: `lugar-${id}`,
  type: "cafe",
  status: "approved",
  location: { lat: ORIGIN.lat + dLat, lng: ORIGIN.lng + dLng },
  photos: ["a.jpg", "b.jpg"],
  ...extra,
})

function request(query: string) {
  return new NextRequest(`http://localhost:3000/api/places/near?${query}`)
}

function mockCandidates(docs: unknown[]) {
  const limit = jest.fn(() => ({ lean: () => Promise.resolve(docs) }))
  mockFind.mockReturnValue({ limit })
  return limit
}

describe("GET /api/places/near", () => {
  beforeEach(() => {
    mockFind.mockReset()
    mockAggregate.mockReset()
  })

  it("devuelve los lugares dentro del radio, del más cercano al más lejano", async () => {
    mockCandidates([place("lejos", 0.02), place("cerca", 0.002), place("medio", 0.009), place("afuera", 0.03)])
    const res = await GET(request(`lat=${ORIGIN.lat}&lng=${ORIGIN.lng}&radius=3000`))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.places.map((p: { slug: string }) => p.slug)).toEqual(["lugar-cerca", "lugar-medio", "lugar-lejos"])
    expect(body.places[0].distance).toBeGreaterThan(200)
    expect(body.places[0].distance).toBeLessThan(250)
    expect(body.places[0].photos).toEqual(["a.jpg"])
  })

  it("busca en un rectángulo con el índice de lat/lng, sin $geoNear", async () => {
    const limit = mockCandidates([])
    await GET(request(`lat=${ORIGIN.lat}&lng=${ORIGIN.lng}&radius=1000`))
    expect(mockAggregate).not.toHaveBeenCalled()
    const [{ $and: [filter, query] }, projection] = mockFind.mock.calls[0]
    expect(filter).toEqual({ status: "approved" })
    expect(query["location.lat"].$gte).toBeCloseTo(ORIGIN.lat - 1000 / 111_320, 5)
    expect(query["location.lat"].$lte).toBeCloseTo(ORIGIN.lat + 1000 / 111_320, 5)
    // En la latitud de Buenos Aires un grado de longitud mide menos: el rectángulo es más ancho en grados.
    expect(query["location.lng"].$lte - query["location.lng"].$gte).toBeGreaterThan(2 * (1000 / 111_320))
    expect(projection).not.toHaveProperty("aiEnrichment")
    expect(projection).not.toHaveProperty("editLog")
    expect(limit).toHaveBeenCalled()
  })

  it("corta en 50 resultados", async () => {
    mockCandidates(Array.from({ length: 80 }, (_, i) => place(String(i), i * 0.00001)))
    const body = await (await GET(request(`lat=${ORIGIN.lat}&lng=${ORIGIN.lng}&radius=5000`))).json()
    expect(body.places).toHaveLength(50)
  })

  it("ignora lugares sin coordenadas", async () => {
    mockCandidates([place("ok", 0.001), { ...place("sin", 0), location: undefined }])
    const body = await (await GET(request(`lat=${ORIGIN.lat}&lng=${ORIGIN.lng}`))).json()
    expect(body.places.map((p: { slug: string }) => p.slug)).toEqual(["lugar-ok"])
  })

  it("400 sin coordenadas válidas", async () => {
    const res = await GET(request("lat=abc&lng=-58"))
    expect(res.status).toBe(400)
  })
})
