import { NextRequest } from "next/server"
import { GET } from "@/app/api/places/route"

jest.mock("@/lib/mongodb", () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}))

jest.mock("@/models/Place", () => ({
  Place: {
    find: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue([]),
    countDocuments: jest.fn().mockResolvedValue(0),
  },
}))

jest.mock("@/models/Review", () => ({
  Review: {
    aggregate: jest.fn().mockResolvedValue([]),
  },
}))

jest.mock("@/models/ContaminationReport", () => ({
  ContaminationReport: {
    aggregate: jest.fn().mockResolvedValue([]),
  },
}))

jest.mock("@/lib/rate-limit")

describe("GET /api/places - Rate Limiting", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns 429 when rate limit is exceeded", async () => {
    const { checkRateLimitByIp } = require("@/lib/rate-limit")
    checkRateLimitByIp.mockResolvedValue({ allowed: false, remaining: 0 })

    const request = new NextRequest("http://localhost:3000/api/places?limit=20")

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(429)
    expect(body.error).toContain("Demasiadas solicitudes")
    expect(response.headers.get("Retry-After")).toBe("60")
    expect(response.headers.get("X-RateLimit-Limit")).toBeTruthy()
  })

  it("allows request when under rate limit", async () => {
    const { checkRateLimitByIp } = require("@/lib/rate-limit")
    checkRateLimitByIp.mockResolvedValue({ allowed: true, remaining: 100 })

    const request = new NextRequest("http://localhost:3000/api/places?limit=20")

    const response = await GET(request)

    expect(response.status).not.toBe(429)
    expect(checkRateLimitByIp).toHaveBeenCalledWith(
      request,
      "public_places_list",
      expect.any(Number),
      expect.any(Number)
    )
  })

  it("respects PUBLIC_PLACES_MAX_LIMIT cap", async () => {
    const { checkRateLimitByIp } = require("@/lib/rate-limit")
    checkRateLimitByIp.mockResolvedValue({ allowed: true, remaining: 100 })
    const { Place } = require("@/models/Place")

    const request = new NextRequest("http://localhost:3000/api/places?limit=99999")

    await GET(request)

    // Should be capped to PUBLIC_PLACES_MAX_LIMIT (5000)
    expect(Place.limit).toHaveBeenCalledWith(5000)
  })

  it("uses lean list select for performance", async () => {
    const { checkRateLimitByIp } = require("@/lib/rate-limit")
    checkRateLimitByIp.mockResolvedValue({ allowed: true, remaining: 100 })
    const { Place } = require("@/models/Place")

    const request = new NextRequest("http://localhost:3000/api/places?limit=50")

    await GET(request)

    // Should use PUBLIC_PLACE_LIST_SELECT which excludes contact, delivery, etc.
    const selectCall = Place.select.mock.calls[0]?.[0]
    expect(selectCall).toContain("-contact")
    expect(selectCall).toContain("-delivery")
    expect(selectCall).toContain("-description")
  })
})
