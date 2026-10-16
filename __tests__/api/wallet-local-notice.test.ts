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
const mockGetProgram = jest.fn()
const mockSave = jest.fn()
jest.mock("@/lib/wallet/loyalty", () => ({
  ...jest.requireActual("@/lib/wallet/loyalty"),
  getProgramWithPlace: (...a: unknown[]) => mockGetProgram(...a),
  saveProgramNotice: (...a: unknown[]) => mockSave(...a),
}))
const mockNotify = jest.fn()
jest.mock("@/lib/wallet/notify", () => ({
  notifyProgramNotice: (...a: unknown[]) => mockNotify(...a),
}))

import { POST } from "@/app/api/local/programas/[programaId]/aviso/route"

const programId = new mongoose.Types.ObjectId()
const req = (body: unknown) =>
  new NextRequest(`http://localhost:3000/api/local/programas/${programId}/aviso`, {
    method: "POST",
    body: JSON.stringify(body),
  })
const params = { params: { programaId: programId.toString() } }
const program = { _id: programId, staffEmails: ["caja@polvorin.com"], active: true }
const staff = { user: { id: "u1", email: "Caja@Polvorin.com", role: "user" } }

describe("POST /api/local/programas/[programaId]/aviso", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetProgram.mockResolvedValue({ program, placeName: "Polvorín", placePath: "/lugar/polvorin" })
  })

  it("requires a session", async () => {
    mockRequireAuth.mockResolvedValue(NextResponse.json({}, { status: 401 }))
    expect((await POST(req({ texto: "Hola a todos" }), params)).status).toBe(401)
  })

  it("is only for the place's staff or an admin", async () => {
    mockRequireAuth.mockResolvedValue({ user: { id: "u2", email: "cliente@gmail.com", role: "user" } })
    expect((await POST(req({ texto: "Hola a todos" }), params)).status).toBe(403)
    expect(mockSave).not.toHaveBeenCalled()
  })

  it("rejects links and empty notices before saving", async () => {
    mockRequireAuth.mockResolvedValue(staff)
    const res = await POST(req({ texto: "Mirá https://bit.ly/x" }), params)
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe("Sin links: el aviso es sólo texto.")
    expect((await POST(req({ texto: "" }), params)).status).toBe(400)
    expect(mockSave).not.toHaveBeenCalled()
  })

  it("saves the notice and sends it to every card", async () => {
    mockRequireAuth.mockResolvedValue(staff)
    const saved = { ...program, notice: { text: "Salieron las medialunas" } }
    mockSave.mockResolvedValue({ ok: true, program: saved })
    const res = await POST(req({ texto: "  Salieron   las medialunas " }), params)
    expect(res.status).toBe(200)
    expect((await res.json()).texto).toBe("Salieron las medialunas")
    expect(mockSave).toHaveBeenCalledWith(programId, "Salieron las medialunas", "caja@polvorin.com", expect.any(Date))
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ program: saved, placeName: "Polvorín" }),
      "Salieron las medialunas",
      expect.any(Date)
    )
  })

  it("says when the next notice can go out", async () => {
    mockRequireAuth.mockResolvedValue(staff)
    mockSave.mockResolvedValue({ ok: false, reason: "too_soon", nextAt: new Date("2026-10-17T11:00:00Z") })
    const res = await POST(req({ texto: "Otro aviso" }), params)
    expect(res.status).toBe(429)
    expect((await res.json()).error).toMatch(/^Ya mandaste un aviso hoy\. El próximo, desde el 17\/10.*08:00\.$/)
    expect(mockNotify).not.toHaveBeenCalled()

    mockSave.mockResolvedValue({ ok: false, reason: "paused" })
    expect((await POST(req({ texto: "Otro aviso" }), params)).status).toBe(409)
  })
})
