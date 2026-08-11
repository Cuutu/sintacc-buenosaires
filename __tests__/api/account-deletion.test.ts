/**
 * @jest-environment node
 */
import { NextRequest } from "next/server"
import { ACCOUNT_DELETE_CONFIRM } from "@/lib/account-deletion-constants"

jest.mock("@/lib/mongodb", () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}))

const mockRequireAuth = jest.fn()
jest.mock("@/lib/middleware", () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}))

jest.mock("@/lib/rate-limit", () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 4 }),
}))

jest.mock("@/lib/logger", () => ({
  logApiError: jest.fn(),
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

const mockDelete = jest.fn()
jest.mock("@/lib/account-deletion", () => ({
  ACCOUNT_DELETE_CONFIRM: "ELIMINAR",
  AccountDeletionError: class AccountDeletionError extends Error {
    code: string
    httpStatus: number
    constructor(message: string, code: string, httpStatus = 400) {
      super(message)
      this.code = code
      this.httpStatus = httpStatus
    }
  },
  deleteAuthenticatedAccount: (...args: unknown[]) => mockDelete(...args),
}))

jest.mock("@/models/User", () => ({
  User: {
    findById: jest.fn(() => ({
      select: () => ({
        lean: async () => ({ appleSub: "sub-1" }),
      }),
    })),
  },
}))

describe("DELETE /api/account", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireAuth.mockResolvedValue({
      user: { id: "507f1f77bcf86cd799439011", email: "u@test.com", role: "user" },
    })
    mockDelete.mockResolvedValue({
      ok: true,
      appleRevoke: "not_applicable",
      appleManualInstructions: false,
      cloudinaryPending: 0,
      deleted: {},
    })
  })

  it("401 si no autenticado", async () => {
    const { NextResponse } = await import("next/server")
    mockRequireAuth.mockResolvedValueOnce(
      NextResponse.json({ error: "No autorizado" }, { status: 401 })
    )
    const { DELETE } = await import("@/app/api/account/route")
    const req = new NextRequest("http://localhost:3000/api/account", {
      method: "DELETE",
      body: JSON.stringify({ confirm: ACCOUNT_DELETE_CONFIRM }),
    })
    const res = await DELETE(req)
    expect(res.status).toBe(401)
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it("rechaza userId del cliente", async () => {
    const { DELETE } = await import("@/app/api/account/route")
    const req = new NextRequest("http://localhost:3000/api/account", {
      method: "DELETE",
      headers: { "content-type": "application/json", origin: "http://localhost:3000" },
      body: JSON.stringify({
        confirm: ACCOUNT_DELETE_CONFIRM,
        userId: "507f1f77bcf86cd799439099",
      }),
    })
    const res = await DELETE(req)
    expect(res.status).toBe(400)
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it("elimina usando solo el userId de sesión", async () => {
    const { DELETE } = await import("@/app/api/account/route")
    const req = new NextRequest("http://localhost:3000/api/account", {
      method: "DELETE",
      headers: { "content-type": "application/json", origin: "http://localhost:3000" },
      body: JSON.stringify({ confirm: ACCOUNT_DELETE_CONFIRM }),
    })
    const res = await DELETE(req)
    expect(res.status).toBe(200)
    expect(mockDelete).toHaveBeenCalledWith(
      expect.objectContaining({
        authenticatedUserId: "507f1f77bcf86cd799439011",
        confirm: ACCOUNT_DELETE_CONFIRM,
      })
    )
  })
})

describe("GET /api/account", () => {
  it("devuelve hasAppleSub", async () => {
    mockRequireAuth.mockResolvedValue({
      user: { id: "507f1f77bcf86cd799439011", email: "u@test.com", role: "user" },
    })
    const { GET } = await import("@/app/api/account/route")
    const req = new NextRequest("http://localhost:3000/api/account")
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.hasAppleSub).toBe(true)
  })
})
