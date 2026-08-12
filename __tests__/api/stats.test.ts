/**
 * @jest-environment node
 */
import { GET } from "@/app/api/stats/route"
import { NextRequest } from "next/server"

jest.mock("@/lib/rate-limit")
jest.mock("@/lib/stats/get-public-stats", () => ({
  getPublicStats: jest.fn().mockResolvedValue({
    placesCount: 10,
    usersCount: 25,
    reviewsCountCelimap: 50,
    reviewsCountGoogle: 40,
    reviewsCount: 90,
  }),
}))

describe("GET /api/stats", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    require("@/lib/rate-limit").checkRateLimitByIp = jest.fn().mockResolvedValue({
      allowed: true,
      remaining: 119,
    })
  })

  it("returns stats with CeliMap + Google review totals", async () => {
    const request = new NextRequest("http://localhost:3000/api/stats")
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      placesCount: 10,
      usersCount: 25,
      reviewsCountCelimap: 50,
      reviewsCountGoogle: 40,
      reviewsCount: 90,
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
