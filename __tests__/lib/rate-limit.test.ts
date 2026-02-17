import { NextRequest } from "next/server"
import { getClientIp, checkRateLimitByIp } from "@/lib/rate-limit"

jest.mock("@/lib/mongodb")
jest.mock("@/models/RateLimitIp")

describe("rate-limit", () => {
  describe("getClientIp", () => {
    it("extracts IP from x-forwarded-for", () => {
      const request = new NextRequest("http://localhost:3000", {
        headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
      })
      expect(getClientIp(request)).toBe("1.2.3.4")
    })

    it("falls back to x-real-ip", () => {
      const request = new NextRequest("http://localhost:3000", {
        headers: { "x-real-ip": "10.0.0.1" },
      })
      expect(getClientIp(request)).toBe("10.0.0.1")
    })

    it("falls back to x-vercel-forwarded-for", () => {
      const request = new NextRequest("http://localhost:3000", {
        headers: { "x-vercel-forwarded-for": "203.0.113.42" },
      })
      expect(getClientIp(request)).toBe("203.0.113.42")
    })

    it("falls back to cf-connecting-ip (Cloudflare)", () => {
      const request = new NextRequest("http://localhost:3000", {
        headers: { "cf-connecting-ip": "198.51.100.1" },
      })
      expect(getClientIp(request)).toBe("198.51.100.1")
    })

    it("returns unknown when no headers", () => {
      const request = new NextRequest("http://localhost:3000")
      expect(getClientIp(request)).toBe("unknown")
    })

    it("prioritizes x-forwarded-for over x-real-ip", () => {
      const request = new NextRequest("http://localhost:3000", {
        headers: {
          "x-forwarded-for": "1.2.3.4",
          "x-real-ip": "10.0.0.1",
        },
      })
      expect(getClientIp(request)).toBe("1.2.3.4")
    })
  })

  describe("checkRateLimitByIp", () => {
    const mockFindOneAndUpdate = jest.fn()

    beforeEach(() => {
      jest.clearAllMocks()
      const RateLimitIp = require("@/models/RateLimitIp").RateLimitIp
      RateLimitIp.findOneAndUpdate = mockFindOneAndUpdate
    })

    it("returns allowed when under limit", async () => {
      mockFindOneAndUpdate.mockResolvedValue({ count: 5 })
      const request = new NextRequest("http://localhost:3000", {
        headers: { "x-forwarded-for": "1.2.3.4" },
      })
      const result = await checkRateLimitByIp(request, "stats", 120, 15)
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(115)
    })

    it("returns not allowed when over limit", async () => {
      mockFindOneAndUpdate.mockResolvedValue({ count: 121 })
      const request = new NextRequest("http://localhost:3000", {
        headers: { "x-forwarded-for": "1.2.3.4" },
      })
      const result = await checkRateLimitByIp(request, "stats", 120, 15)
      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
    })
  })
})
