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

describe("requireAuth rejects deleted user JWT", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("401 cuando User.exists es null", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "507f1f77bcf86cd799439011", email: "x@y.com", role: "user" },
    })
    mockExists.mockResolvedValue(null)
    const { requireAuth } = await import("@/lib/middleware")
    const res = await requireAuth({} as NextRequest)
    expect(res).toBeInstanceOf(NextResponse)
    if (res instanceof NextResponse) {
      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body.code).toBe("account_deleted")
    }
  })

  it("permite sesión si User existe", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "507f1f77bcf86cd799439011", email: "x@y.com", role: "user" },
    })
    mockExists.mockResolvedValue({ _id: "507f1f77bcf86cd799439011" })
    const { requireAuth } = await import("@/lib/middleware")
    const res = await requireAuth({} as NextRequest)
    expect(res).not.toBeInstanceOf(NextResponse)
    expect((res as { user: { id: string } }).user.id).toBe(
      "507f1f77bcf86cd799439011"
    )
  })

  it("getOptionalActiveSession → null si borrado", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "507f1f77bcf86cd799439011", email: "x@y.com", role: "user" },
    })
    mockExists.mockResolvedValue(null)
    const { getOptionalActiveSession } = await import("@/lib/middleware")
    const s = await getOptionalActiveSession()
    expect(s).toBeNull()
  })
})
