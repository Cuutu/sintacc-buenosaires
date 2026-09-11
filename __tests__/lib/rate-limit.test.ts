/**
 * @jest-environment node
 */
import { NextRequest } from "next/server"
import { getClientIp, checkRateLimitByIp } from "@/lib/rate-limit"

jest.mock("@/lib/mongodb")
jest.mock("@/models/RateLimitIp")

describe("rate-limit", () => {
  describe("getClientIp", () => {
    it("usa x-vercel-forwarded-for primero (header de plataforma)", () => {
      const request = new NextRequest("http://localhost:3000", {
        headers: {
          "x-vercel-forwarded-for": "203.0.113.42",
          "x-forwarded-for": "1.2.3.4",
          "x-real-ip": "10.0.0.1",
          "cf-connecting-ip": "198.51.100.1",
        },
      })
      expect(getClientIp(request)).toBe("203.0.113.42")
    })

    it("no deja que x-forwarded-for pise el header de Vercel", () => {
      const request = new NextRequest("http://localhost:3000", {
        headers: {
          "x-forwarded-for": "8.8.8.8, 203.0.113.42",
          "x-vercel-forwarded-for": "203.0.113.9",
        },
      })
      expect(getClientIp(request)).toBe("203.0.113.9")
    })

    it("cae a x-real-ip si no hay header de Vercel", () => {
      const request = new NextRequest("http://localhost:3000", {
        headers: { "x-real-ip": "10.0.0.1" },
      })
      expect(getClientIp(request)).toBe("10.0.0.1")
    })

    it("cae a x-forwarded-for al final", () => {
      const request = new NextRequest("http://localhost:3000", {
        headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
      })
      expect(getClientIp(request)).toBe("1.2.3.4")
    })

    it("no usa cf-connecting-ip (el cliente lo puede mandar)", () => {
      const request = new NextRequest("http://localhost:3000", {
        headers: { "cf-connecting-ip": "198.51.100.1" },
      })
      expect(getClientIp(request)).toBe("unknown")
    })

    it("returns unknown when no headers", () => {
      const request = new NextRequest("http://localhost:3000")
      expect(getClientIp(request)).toBe("unknown")
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
        headers: { "x-vercel-forwarded-for": "1.2.3.4" },
      })
      const result = await checkRateLimitByIp(request, "stats", 120, 15)
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(115)
    })

    it("returns not allowed when over limit", async () => {
      mockFindOneAndUpdate.mockResolvedValue({ count: 121 })
      const request = new NextRequest("http://localhost:3000", {
        headers: { "x-vercel-forwarded-for": "1.2.3.4" },
      })
      const result = await checkRateLimitByIp(request, "stats", 120, 15)
      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
      expect(result.retryAfterSeconds).toBeGreaterThan(0)
    })
  })
})
