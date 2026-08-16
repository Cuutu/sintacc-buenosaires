/**
 * @jest-environment node
 */
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

jest.mock("@/lib/mongodb", () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}))

const mockGetServerSession = jest.fn()
jest.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}))

jest.mock("@/lib/auth", () => ({ authOptions: {} }))

const mockExists = jest.fn()
jest.mock("@/models/User", () => ({
  User: {
    exists: (...args: unknown[]) => mockExists(...args),
  },
}))

function req(method = "GET"): NextRequest {
  return { method } as NextRequest
}

describe("requireAdmin", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("GET sin sesión → 401", async () => {
    mockGetServerSession.mockResolvedValue(null)
    const { requireAdmin } = await import("@/lib/middleware")
    const res = await requireAdmin(req("GET"))
    expect(res).toBeInstanceOf(NextResponse)
    if (res instanceof NextResponse) {
      expect(res.status).toBe(401)
    }
  })

  it("GET usuario sin rol admin → 403", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "507f1f77bcf86cd799439011", email: "u@x.com", role: "user" },
    })
    mockExists.mockResolvedValue({ _id: "507f1f77bcf86cd799439011" })
    const { requireAdmin } = await import("@/lib/middleware")
    const res = await requireAdmin(req("GET"))
    expect(res).toBeInstanceOf(NextResponse)
    if (res instanceof NextResponse) {
      expect(res.status).toBe(403)
    }
  })

  it("GET admin real → sesión", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "507f1f77bcf86cd799439011", email: "a@x.com", role: "admin" },
    })
    mockExists.mockResolvedValue({ _id: "507f1f77bcf86cd799439011" })
    const { requireAdmin } = await import("@/lib/middleware")
    const res = await requireAdmin(req("GET"))
    expect(res).not.toBeInstanceOf(NextResponse)
    expect((res as { user: { role: string } }).user.role).toBe("admin")
  })

  it("no inventa usuario Preview en GET", async () => {
    mockGetServerSession.mockResolvedValue(null)
    const { requireAdmin } = await import("@/lib/middleware")
    const res = await requireAdmin(req("GET"))
    expect(res).toBeInstanceOf(NextResponse)
    if (!(res instanceof NextResponse)) {
      throw new Error("expected deny")
    }
    const body = await res.json()
    expect(JSON.stringify(body)).not.toContain("Preview")
  })
})
