/**
 * @jest-environment node
 */
import { GET } from "@/app/api/places/route"
import { NextRequest, NextResponse } from "next/server"
import { PUBLIC_PLACES_MAX_LIMIT } from "@/lib/validations"
import { PUBLIC_PLACE_LIST_SELECT } from "@/lib/places-public-select"

jest.mock("next/cache", () => ({
  unstable_cache: (loader: () => Promise<unknown>) => () => loader(),
  revalidateTag: jest.fn(),
}))
jest.mock("@/lib/mongodb")
jest.mock("@/lib/api-cache", () => ({
  getOrSetApiCache: (_key: string, _ttl: number, loader: () => Promise<unknown>) =>
    loader(),
  invalidateApiCache: jest.fn(),
}))
jest.mock("@/lib/public-read-limit", () => ({
  enforcePublicReadRateLimit: jest.fn().mockResolvedValue(null),
}))
jest.mock("@/models/Place")
jest.mock("@/models/Review")
jest.mock("@/models/ContaminationReport")

function mockFind(places: unknown[], onLimit?: (n: number) => void) {
  require("@/models/Place").Place.find = jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockImplementation((n: number) => {
            onLimit?.(n)
            return { lean: jest.fn().mockResolvedValue(places) }
          }),
        }),
      }),
    }),
  })
}

describe("GET /api/places", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    require("@/lib/public-read-limit").enforcePublicReadRateLimit.mockResolvedValue(null)
    require("@/models/Review").Review.aggregate = jest.fn().mockResolvedValue([])
    require("@/models/ContaminationReport").ContaminationReport.aggregate = jest
      .fn()
      .mockResolvedValue([])
  })

  it(`clamps limit above max to PUBLIC_PLACES_MAX_LIMIT (${PUBLIC_PLACES_MAX_LIMIT})`, async () => {
    let capturedLimit = 0
    mockFind([], (n) => {
      capturedLimit = n
    })
    require("@/models/Place").Place.countDocuments = jest.fn().mockResolvedValue(0)

    const overMax = PUBLIC_PLACES_MAX_LIMIT + 2500
    const request = new NextRequest(
      `http://localhost:3000/api/places?limit=${overMax}`
    )
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(capturedLimit).toBe(PUBLIC_PLACES_MAX_LIMIT)
  })

  it("allows limit within max (map uses up to PUBLIC_PLACES_MAX_LIMIT)", async () => {
    let capturedLimit = 0
    mockFind([], (n) => {
      capturedLimit = n
    })
    require("@/models/Place").Place.countDocuments = jest.fn().mockResolvedValue(0)

    const within = Math.min(500, PUBLIC_PLACES_MAX_LIMIT)
    const request = new NextRequest(
      `http://localhost:3000/api/places?limit=${within}`
    )
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(capturedLimit).toBe(within)
  })

  it("should return places with filters", async () => {
    const mockPlaces = [
      {
        _id: "place1",
        name: "Test Place 1",
        type: "restaurant",
        neighborhood: "Palermo",
        status: "approved",
      },
      {
        _id: "place2",
        name: "Test Place 2",
        type: "cafe",
        neighborhood: "Recoleta",
        status: "approved",
      },
    ]

    mockFind(mockPlaces)
    require("@/models/Place").Place.countDocuments = jest
      .fn()
      .mockResolvedValue(2)

    const request = new NextRequest("http://localhost:3000/api/places?type=restaurant&neighborhood=Palermo")

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.places).toHaveLength(2)
  })

  it("should handle search query", async () => {
    const mockPlaces = [
      {
        _id: "place1",
        name: "Test Place",
        status: "approved",
      },
    ]

    mockFind(mockPlaces)
    require("@/models/Place").Place.countDocuments = jest
      .fn()
      .mockResolvedValue(1)

    const request = new NextRequest("http://localhost:3000/api/places?search=test")

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.places).toHaveLength(1)
  })

  it("sends bbox to Mongo and still filters in memory", async () => {
    const mockPlaces = [
      { _id: "in", name: "In", location: { lat: -34.6, lng: -58.4 } },
      { _id: "out", name: "Out", location: { lat: -38.4, lng: -63.6 } },
    ]
    let capturedQuery: Record<string, unknown> = {}
    let capturedSelect = ""
    require("@/models/Place").Place.find = jest.fn().mockImplementation((q) => {
      capturedQuery = q
      return {
        select: jest.fn().mockImplementation((sel: string) => {
          capturedSelect = sel
          return {
            sort: jest.fn().mockReturnValue({
              skip: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  lean: jest.fn().mockResolvedValue(mockPlaces),
                }),
              }),
            }),
          }
        }),
      }
    })
    require("@/models/Place").Place.countDocuments = jest.fn().mockResolvedValue(2)

    const request = new NextRequest(
      "http://localhost:3000/api/places?limit=5000&bbox=-58.5,-34.8,-58.3,-34.4"
    )
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(capturedQuery["location.lat"]).toEqual({ $gte: -34.8, $lte: -34.4 })
    expect(capturedQuery["location.lng"]).toEqual({ $gte: -58.5, $lte: -58.3 })
    expect(capturedSelect).toBe(PUBLIC_PLACE_LIST_SELECT)
    expect(capturedSelect).not.toContain("contact")
    expect(data.places.map((p: { _id: string }) => p._id)).toEqual(["in"])
  })

  it("keeps Mongo pagination for bbox so the map can page past 100", async () => {
    const mockPlaces = Array.from({ length: 100 }, (_, i) => ({
      _id: `p${i}`,
      name: `Place ${i}`,
      location: { lat: -34.6, lng: -58.4 },
    }))
    mockFind(mockPlaces)
    require("@/models/Place").Place.countDocuments = jest.fn().mockResolvedValue(350)

    const request = new NextRequest(
      "http://localhost:3000/api/places?limit=100&bbox=-58.5,-34.8,-58.3,-34.4"
    )
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.places).toHaveLength(100)
    expect(data.pagination.total).toBe(350)
    expect(data.pagination.pages).toBe(4)
    expect(data.pagination.limit).toBe(100)
  })

  it("returns lean list items without clone-friendly contact fields", async () => {
    mockFind([
      {
        _id: "place1",
        name: "Test Place",
        type: "restaurant",
        neighborhood: "Palermo",
        contact: { phone: "111", whatsapp: "222" },
        description: "texto largo",
        editLog: [{ at: new Date(), fields: ["name"] }],
      },
    ])
    require("@/models/Place").Place.countDocuments = jest.fn().mockResolvedValue(1)

    const response = await GET(new NextRequest("http://localhost:3000/api/places?limit=20"))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.places[0].name).toBe("Test Place")
    expect(data.places[0].contact).toBeUndefined()
    expect(data.places[0].description).toBeUndefined()
    expect(data.places[0].editLog).toBeUndefined()
  })

  it("returns 429 with Retry-After when the public list limiter trips", async () => {
    require("@/lib/public-read-limit").enforcePublicReadRateLimit.mockResolvedValue(
      NextResponse.json(
        { error: "Demasiadas solicitudes. Probá de nuevo en un momento." },
        { status: 429, headers: { "Retry-After": "12" } }
      )
    )

    const response = await GET(new NextRequest("http://localhost:3000/api/places"))

    expect(response.status).toBe(429)
    expect(response.headers.get("Retry-After")).toBe("12")
  })
})
