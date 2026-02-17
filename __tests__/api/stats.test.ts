import { GET } from "@/app/api/stats/route"
import { NextRequest } from "next/server"

jest.mock("@/lib/mongodb")
jest.mock("@/lib/rate-limit")
jest.mock("@/models/Place")
jest.mock("@/models/Review")
jest.mock("@/models/User")

describe("GET /api/stats", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    require("@/lib/rate-limit").checkRateLimitByIp = jest.fn().mockResolvedValue({
      allowed: true,
      remaining: 119,
    })
    require("@/models/Place").Place.countDocuments = jest.fn().mockResolvedValue(10)
    require("@/models/Review").Review.countDocuments = jest.fn().mockResolvedValue(50)
    require("@/models/User").User.countDocuments = jest.fn().mockResolvedValue(25)
  })

  it("returns stats when under rate limit", async () => {
    const request = new NextRequest("http://localhost:3000/api/stats")
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      placesCount: 10,
      reviewsCount: 50,
      usersCount: 25,
    })
  })

  it("returns 429 when rate limit exceeded", async () => {
    require("@/lib/rate-limit").checkRateLimitByIp = jest.fn().mockResolvedValue({
      allowed: false,
      remaining: 0,
    })
    const request = new NextRequest("http://localhost:3000/api/stats")
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(429)
    expect(data.error).toContain("Demasiadas solicitudes")
  })
})
