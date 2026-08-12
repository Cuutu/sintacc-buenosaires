/**
 * @jest-environment node
 */
import { GET } from "@/app/api/places/route"
import { NextRequest } from "next/server"
import { PUBLIC_PLACES_MAX_LIMIT } from "@/lib/validations"

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
jest.mock("@/models/Place")
jest.mock("@/models/Review")
jest.mock("@/models/ContaminationReport")

describe("GET /api/places", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    require("@/models/Review").Review.aggregate = jest.fn().mockResolvedValue([])
    require("@/models/ContaminationReport").ContaminationReport.aggregate = jest
      .fn()
      .mockResolvedValue([])
  })

  it(`clamps limit above max to PUBLIC_PLACES_MAX_LIMIT (${PUBLIC_PLACES_MAX_LIMIT})`, async () => {
    let capturedLimit = 0
    require("@/models/Place").Place.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockImplementation((n: number) => {
            capturedLimit = n
            return { lean: jest.fn().mockResolvedValue([]) }
          }),
        }),
      }),
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
    require("@/models/Place").Place.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockImplementation((n: number) => {
            capturedLimit = n
            return { lean: jest.fn().mockResolvedValue([]) }
          }),
        }),
      }),
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

    require("@/models/Place").Place.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockPlaces),
          }),
        }),
      }),
    })

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

    require("@/models/Place").Place.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockPlaces),
          }),
        }),
      }),
    })

    require("@/models/Place").Place.countDocuments = jest
      .fn()
      .mockResolvedValue(1)

    const request = new NextRequest("http://localhost:3000/api/places?search=test")

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.places).toHaveLength(1)
  })
})
