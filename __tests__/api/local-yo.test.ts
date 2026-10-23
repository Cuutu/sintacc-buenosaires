/**
 * @jest-environment node
 */
import { NextRequest, NextResponse } from "next/server"
import mongoose from "mongoose"

const mockRequireAuth = jest.fn()
jest.mock("@/lib/middleware", () => ({
  requireAuth: (...a: unknown[]) => mockRequireAuth(...a),
}))
jest.mock("@/lib/logger", () => ({ logApiError: jest.fn() }))
jest.mock("@/lib/mongodb", () => ({ __esModule: true, default: jest.fn().mockResolvedValue(undefined) }))

const mockProgramFind = jest.fn()
jest.mock("@/models/LoyaltyProgram", () => ({
  LoyaltyProgram: { find: (...a: unknown[]) => mockProgramFind(...a) },
}))
const mockPlaceFind = jest.fn()
jest.mock("@/models/Place", () => ({
  Place: { find: (...a: unknown[]) => mockPlaceFind(...a) },
}))

import { GET } from "@/app/api/local/yo/route"

const req = () => new NextRequest("http://localhost:3000/api/local/yo")
const polvorinId = new mongoose.Types.ObjectId()
const polvorin = { placeId: polvorinId, brandName: "Polvorín" }

/** Simula LoyaltyProgram.find: devuelve los programas donde el email es del personal. */
function programsByStaff(rows: Record<string, Array<typeof polvorin>>) {
  mockProgramFind.mockImplementation((filter: { $or?: Array<Record<string, string>> }) => {
    const email = filter?.$or?.[0]?.staffEmails
    const result = email ? rows[email] ?? [] : [polvorin] // sin filtro = todos (lo que hacía con el admin)
    return { select: () => ({ limit: () => ({ lean: () => Promise.resolve(result) }) }) }
  })
}

describe("GET /api/local/yo", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPlaceFind.mockReturnValue({ select: () => ({ lean: () => Promise.resolve([{ _id: polvorinId, name: "Polvorín" }]) }) })
    programsByStaff({ "caja@polvorin.com": [polvorin] })
  })

  it("pide sesión", async () => {
    mockRequireAuth.mockResolvedValue(NextResponse.json({}, { status: 401 }))
    expect((await GET(req())).status).toBe(401)
  })

  it("usuario común sin local: local false", async () => {
    mockRequireAuth.mockResolvedValue({ user: { id: "u1", email: "cliente@gmail.com", role: "user" } })
    const body = await (await GET(req())).json()
    expect(body).toEqual({ local: false, lugares: [] })
  })

  it("admin sin local propio: local false (antes le listaba todos los locales)", async () => {
    mockRequireAuth.mockResolvedValue({ user: { id: "a1", email: "admin@celimap.com.ar", role: "admin" } })
    const body = await (await GET(req())).json()
    expect(body).toEqual({ local: false, lugares: [] })
    // Siempre filtra por el personal del local, nunca pide todos los programas.
    expect(mockProgramFind).toHaveBeenCalledWith(
      expect.objectContaining({ $or: expect.arrayContaining([{ staffEmails: "admin@celimap.com.ar" }]) })
    )
    expect(body).not.toHaveProperty("admin")
  })

  it("admin que además es de un local: lo ve como cualquier dueño", async () => {
    programsByStaff({ "admin@celimap.com.ar": [polvorin] })
    mockRequireAuth.mockResolvedValue({ user: { id: "a1", email: "Admin@CeliMap.com.ar", role: "admin" } })
    const body = await (await GET(req())).json()
    expect(body).toEqual({ local: true, lugares: ["Polvorín"] })
  })

  it("personal del local: local true con el nombre", async () => {
    mockRequireAuth.mockResolvedValue({ user: { id: "u2", email: "Caja@Polvorin.com", role: "user" } })
    const res = await GET(req())
    expect(res.headers.get("Cache-Control")).toBe("private, no-store")
    expect(await res.json()).toEqual({ local: true, lugares: ["Polvorín"] })
  })

  it("sin email: local false sin ir a la base", async () => {
    mockRequireAuth.mockResolvedValue({ user: { id: "a2", email: "", role: "admin" } })
    expect(await (await GET(req())).json()).toEqual({ local: false, lugares: [] })
    expect(mockProgramFind).not.toHaveBeenCalled()
  })
})
