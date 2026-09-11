import { NextRequest } from "next/server"
import { GET } from "@/app/api/places/[id]/route"

jest.mock("@/lib/mongodb", () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}))

jest.mock("@/models/Place", () => ({
  Place: {
    findOne: jest.fn().mockResolvedValue({
      _id: "507f1f77bcf86cd799439011",
      name: "Test Place",
      status: "approved",
      lean: jest.fn().mockResolvedValue({
        _id: "507f1f77bcf86cd799439011",
        name: "Test Place",
      }),
    }),
  },
}))

jest.mock("@/models/Review", () => ({
  Review: {
    aggregate: jest.fn().mockResolvedValue([]),
  },
}))

jest.mock("@/models/ContaminationReport", () => ({
  ContaminationReport: {
    countDocuments: jest.fn().mockResolvedValue(0),
  },
}))

jest.mock("@/lib/rate-limit")

describe("GET /api/places/[id] - Rate Limiting", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    const { Place } = require("@/models/Place")
    Place.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: "507f1f77bcf86cd799439011",
        name: "Test Place",
      }),
    })
  })

  it("returns 429 when detail rate limit is exceeded", async () => {
    const { checkRateLimitByIp } = require("@/lib/rate-limit")
    checkRateLimitByIp.mockResolvedValue({ allowed: false, remaining: 0 })

    const request = new NextRequest("http://localhost:3000/api/places/507f1f77bcf86cd799439011")

    const response = await GET(request, { params: { id: "507f1f77bcf86cd799439011" } })
    const body = await response.json()

    expect(response.status).toBe(429)
    expect(body.error).toContain("Demasiadas solicitudes")
    expect(response.headers.get("Retry-After")).toBe("60")
  })

  it("allows detail request when under rate limit", async () => {
    const { checkRateLimitByIp } = require("@/lib/rate-limit")
    checkRateLimitByIp.mockResolvedValue({ allowed: true, remaining: 200 })

    const request = new NextRequest("http://localhost:3000/api/places/507f1f77bcf86cd799439011")

    const response = await GET(request, { params: { id: "507f1f77bcf86cd799439011" } })

    expect(response.status).not.toBe(429)
    expect(checkRateLimitByIp).toHaveBeenCalledWith(
      request,
      "public_places_detail",
      expect.any(Number),
      expect.any(Number)
    )
  })
})
