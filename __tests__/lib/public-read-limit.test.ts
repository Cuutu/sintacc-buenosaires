/**
 * @jest-environment node
 */
import { NextRequest } from "next/server"
import { enforcePublicReadRateLimit } from "@/lib/public-read-limit"
import { __resetMemoryRateLimitForTests } from "@/lib/memory-rate-limit"

jest.mock("@/lib/mongodb", () => jest.fn(() => {
  throw new Error("las lecturas públicas no tienen que tocar Mongo para el rate limit")
}))
jest.mock("@/models/RateLimitIp", () => ({
  RateLimitIp: {
    findOneAndUpdate: jest.fn(() => {
      throw new Error("no debería escribir en Mongo")
    }),
  },
}))

function req(ip: string) {
  return new NextRequest("http://localhost:3000/api/places", { headers: { "x-forwarded-for": ip } })
}

describe("enforcePublicReadRateLimit", () => {
  beforeEach(() => {
    __resetMemoryRateLimitForTests()
    delete process.env.PUBLIC_READ_RATE_LIMIT_LIST
  })

  it("deja pasar 90 listados por minuto por IP y frena el 91 con 429", async () => {
    for (let i = 0; i < 90; i++) {
      expect(await enforcePublicReadRateLimit(req("1.2.3.4"), "list")).toBeNull()
    }
    const limited = await enforcePublicReadRateLimit(req("1.2.3.4"), "list")
    expect(limited?.status).toBe(429)
    expect(limited?.headers.get("Retry-After")).toMatch(/^\d+$/)
    expect(await enforcePublicReadRateLimit(req("5.6.7.8"), "list")).toBeNull()
  })

  it("lista y ficha tienen cupos separados", async () => {
    for (let i = 0; i < 90; i++) await enforcePublicReadRateLimit(req("1.2.3.4"), "list")
    expect(await enforcePublicReadRateLimit(req("1.2.3.4"), "detail")).toBeNull()
  })

  it("un x-vercel-forwarded-for inventado no da cupo nuevo", async () => {
    for (let i = 0; i < 90; i++) {
      const r = new NextRequest("http://localhost:3000/api/places", {
        headers: { "x-forwarded-for": "1.2.3.4", "x-vercel-forwarded-for": `9.9.9.${i}` },
      })
      await enforcePublicReadRateLimit(r, "list")
    }
    const r = new NextRequest("http://localhost:3000/api/places", {
      headers: { "x-forwarded-for": "1.2.3.4", "x-vercel-forwarded-for": "9.9.9.200" },
    })
    expect((await enforcePublicReadRateLimit(r, "list"))?.status).toBe(429)
  })
})
