import { GET } from "@/app/api/places/route"
import { NextRequest } from "next/server"
import { connectDB } from "@/lib/mongodb"
import { Place } from "@/models/Place"

jest.mock("@/lib/mongodb")
jest.mock("@/models/Place")

describe("GET /api/places", () => {
  beforeEach(() => {
    jest.clearAllMocks()
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
