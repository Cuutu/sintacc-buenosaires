/**
 * @jest-environment node
 */
import { NextRequest, NextResponse } from "next/server"

const mockRequireAdmin = jest.fn()
jest.mock("@/lib/middleware", () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
}))

const mockBuild = jest.fn()
const mockConfig = jest.fn()
jest.mock("@/lib/wallet/apple-pass", () => ({
  buildLoyaltyPass: (...args: unknown[]) => mockBuild(...args),
  getApplePassConfig: () => mockConfig(),
}))

import { GET } from "@/app/api/admin/wallet/apple/demo/route"

const req = (qs = "") => new NextRequest(`http://localhost:3000/api/admin/wallet/apple/demo${qs}`)
const ADMIN = { user: { id: "507f1f77bcf86cd799439011", email: "a@x.com", role: "admin" } }

describe("GET /api/admin/wallet/apple/demo", () => {
  beforeEach(() => jest.clearAllMocks())

  it("rechaza sin admin y no genera nada", async () => {
    mockRequireAdmin.mockResolvedValue(NextResponse.json({ error: "No autorizado" }, { status: 401 }))
    const res = await GET(req())
    expect(res.status).toBe(401)
    expect(mockBuild).not.toHaveBeenCalled()
  })

  it("503 si faltan los certificados", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN)
    mockConfig.mockReturnValue(null)
    const res = await GET(req())
    expect(res.status).toBe(503)
  })

  it("devuelve un pkpass no cacheable y acota los sellos", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN)
    mockConfig.mockReturnValue({})
    mockBuild.mockResolvedValue(Buffer.from("PK"))
    const res = await GET(req("?sellos=99"))
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toBe("application/vnd.apple.pkpass")
    expect(res.headers.get("cache-control")).toContain("no-store")
    expect(mockBuild.mock.calls[0][0]).toMatchObject({ stamps: 5, stampsForReward: 5 })
  })
})
