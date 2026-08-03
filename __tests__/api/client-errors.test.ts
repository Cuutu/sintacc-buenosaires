/**
 * @jest-environment node
 */
import { NextRequest } from "next/server"

jest.mock("@/lib/rate-limit", () => ({
  checkRateLimitByIp: jest.fn().mockResolvedValue({ allowed: true, remaining: 39 }),
}))

import { POST, GET } from "@/app/api/client-errors/route"
import { checkRateLimitByIp } from "@/lib/rate-limit"

function makeReq(body: unknown, init?: { origin?: string; length?: number }) {
  const raw = JSON.stringify(body)
  return new NextRequest("https://www.celimap.com.ar/api/client-errors", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: init?.origin || "https://www.celimap.com.ar",
      "content-length": String(init?.length ?? raw.length),
    },
    body: raw,
  })
}

describe("POST /api/client-errors", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(checkRateLimitByIp as jest.Mock).mockResolvedValue({ allowed: true, remaining: 39 })
  })

  it("accepts production payload and returns eventId", async () => {
    const log = jest.spyOn(console, "error").mockImplementation(() => {})
    const res = await POST(
      makeReq({
        source: "page-boundary",
        message: "Algo falló",
        name: "TypeError",
        eventId: "XYZ123",
        route: "/favoritos",
        navigation: { from: "/", to: "/favoritos", slot: "favoritos", timestamp: 1 },
        authStatus: "unauthenticated",
        build: "abc123",
      })
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.eventId).toBe("XYZ123")
    expect(log).toHaveBeenCalledWith(
      "[CELIMAP_CLIENT_ERROR]",
      expect.stringContaining('"eventId":"XYZ123"')
    )
    const logged = JSON.parse((log.mock.calls[0] as unknown as [string, string])[1])
    expect(logged).not.toHaveProperty("cookie")
    expect(JSON.stringify(logged)).not.toMatch(/x-forwarded|authorization/i)
    log.mockRestore()
  })

  it("rejects non-JSON content-type", async () => {
    const req = new NextRequest("https://www.celimap.com.ar/api/client-errors", {
      method: "POST",
      headers: { "content-type": "text/plain", origin: "https://www.celimap.com.ar" },
      body: "nope",
    })
    const res = await POST(req)
    expect(res.status).toBe(415)
  })

  it("rejects oversized body", async () => {
    const huge = { source: "window-error", message: "x".repeat(20_000) }
    const res = await POST(makeReq(huge, { length: 20_000 }))
    expect(res.status).toBe(413)
  })

  it("sanitizes PII attempts", async () => {
    const log = jest.spyOn(console, "error").mockImplementation(() => {})
    const res = await POST(
      makeReq({
        source: "global-error",
        message: "fail user@x.com Bearer tok.abc cookie=secret -34.603722",
        stack: "at https://x?access_token=abc",
        email: "should-strip@x.com",
        cookie: "a=b",
      })
    )
    expect(res.status).toBe(200)
    const line = (log.mock.calls[0] as unknown as [string, string])[1]
    expect(line).not.toContain("user@x.com")
    expect(line).not.toContain("tok.abc")
    expect(line).not.toContain("should-strip")
    expect(line).toContain("[email]")
    log.mockRestore()
  })

  it("rate limits excess events", async () => {
    ;(checkRateLimitByIp as jest.Mock).mockResolvedValue({ allowed: false, remaining: 0 })
    const res = await POST(
      makeReq({ source: "window-error", message: "rate" })
    )
    expect(res.status).toBe(429)
    const json = await res.json()
    expect(json.eventId).toBeTruthy()
  })

  it("GET not allowed", async () => {
    const res = await GET()
    expect(res.status).toBe(405)
  })
})
