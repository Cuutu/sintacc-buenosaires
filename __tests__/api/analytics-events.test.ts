/**
 * @jest-environment node
 */
import { NextRequest } from "next/server"
import { POST } from "@/app/api/analytics/events/route"
import { __resetMemoryRateLimitForTests } from "@/lib/memory-rate-limit"

const mockInsertMany = jest.fn()
jest.mock("@/lib/mongodb", () => jest.fn(() => Promise.resolve()))
jest.mock("@/models/ProductEvent", () => ({
  ProductEvent: { insertMany: (...args: unknown[]) => mockInsertMany(...args) },
}))
jest.mock("@/models/RateLimitIp", () => ({
  RateLimitIp: {
    findOneAndUpdate: jest.fn(() => {
      throw new Error("analytics no tiene que escribir el rate limit en Mongo")
    }),
  },
}))
jest.mock("@/lib/logger", () => ({ logApiError: jest.fn() }))

function eventRequest(ip = "1.2.3.4") {
  const body = JSON.stringify({
    events: [{ name: "web_vital", distinctId: "abcdefgh1234", ts: Date.now(), props: { metric: "LCP", value: 1800 } }],
  })
  return new NextRequest("http://localhost:3000/api/analytics/events", {
    method: "POST",
    body,
    headers: {
      "content-type": "application/json",
      "content-length": String(body.length),
      origin: "https://www.celimap.com.ar",
      "x-forwarded-for": ip,
    },
  })
}

describe("POST /api/analytics/events", () => {
  beforeEach(() => {
    __resetMemoryRateLimitForTests()
    mockInsertMany.mockReset()
  })

  it("responde 204 sin esperar a que Mongo guarde", async () => {
    let resolveInsert: () => void = () => {}
    mockInsertMany.mockReturnValue(new Promise<void>((resolve) => (resolveInsert = resolve)))

    const res = await POST(eventRequest())
    expect(res.status).toBe(204)
    await new Promise((r) => setImmediate(r))
    expect(mockInsertMany).toHaveBeenCalledTimes(1)
    expect(mockInsertMany.mock.calls[0][0][0]).toMatchObject({ name: "web_vital", props: { metric: "LCP" } })
    resolveInsert()
  })

  it("si Mongo falla, igual responde 204", async () => {
    mockInsertMany.mockRejectedValue(new Error("atlas caído"))
    const res = await POST(eventRequest())
    expect(res.status).toBe(204)
    await new Promise((r) => setImmediate(r))
    const { logApiError } = jest.requireMock("@/lib/logger")
    expect(logApiError).toHaveBeenCalled()
  })

  it("después de 120 lotes en 15 minutos deja de guardar para esa IP", async () => {
    mockInsertMany.mockResolvedValue([])
    for (let i = 0; i < 120; i++) await POST(eventRequest())
    await new Promise((r) => setImmediate(r))
    expect(mockInsertMany).toHaveBeenCalledTimes(120)

    const res = await POST(eventRequest())
    expect(res.status).toBe(204)
    await new Promise((r) => setImmediate(r))
    expect(mockInsertMany).toHaveBeenCalledTimes(120)

    await POST(eventRequest("5.6.7.8"))
    await new Promise((r) => setImmediate(r))
    expect(mockInsertMany).toHaveBeenCalledTimes(121)
  })
})
