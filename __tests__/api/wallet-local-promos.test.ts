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
jest.mock("@/lib/mongodb", () => ({ __esModule: true, default: jest.fn() }))
const mockUpdate = jest.fn()
jest.mock("@/models/LoyaltyProgram", () => ({
  LoyaltyProgram: { findByIdAndUpdate: (...a: unknown[]) => mockUpdate(...a) },
}))
const mockGetProgram = jest.fn()
jest.mock("@/lib/wallet/loyalty", () => ({
  ...jest.requireActual("@/lib/wallet/loyalty"),
  getProgramWithPlace: (...a: unknown[]) => mockGetProgram(...a),
}))
const mockRefresh = jest.fn()
jest.mock("@/lib/wallet/notify", () => ({
  refreshProgramCards: (...a: unknown[]) => mockRefresh(...a),
}))

import { PUT } from "@/app/api/local/programas/[programaId]/promos/route"

const programId = new mongoose.Types.ObjectId()
const req = (body: unknown) =>
  new NextRequest(`http://localhost:3000/api/local/programas/${programId}/promos`, {
    method: "PUT",
    body: JSON.stringify(body),
  })
const params = { params: { programaId: programId.toString() } }
const program = { _id: programId, staffEmails: ["caja@polvorin.com"], active: true }
const staff = { user: { id: "u1", email: "Caja@Polvorin.com", role: "user" } }
const window = { days: [2, 1], fromHour: 15, toHour: 18 }

describe("PUT /api/local/programas/[programaId]/promos", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetProgram.mockResolvedValue({ program, placeName: "Polvorín", placePath: "/lugar/polvorin" })
    mockUpdate.mockImplementation(async () => ({ ...program, doubleStamp: { days: [1, 2], fromHour: 15, toHour: 18 } }))
  })

  it("requires a session", async () => {
    mockRequireAuth.mockResolvedValue(NextResponse.json({}, { status: 401 }))
    expect((await PUT(req({ selloDoble: window, traeUnAmigo: false }), params)).status).toBe(401)
  })

  it("is only for the place's staff or an admin", async () => {
    mockRequireAuth.mockResolvedValue({ user: { id: "u2", email: "cliente@gmail.com", role: "user" } })
    expect((await PUT(req({ selloDoble: window, traeUnAmigo: false }), params)).status).toBe(403)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it("rejects impossible hours", async () => {
    mockRequireAuth.mockResolvedValue(staff)
    const res = await PUT(req({ selloDoble: { days: [1], fromHour: 18, toHour: 9 }, traeUnAmigo: false }), params)
    expect(res.status).toBe(400)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it("saves the double stamp and refreshes the cards", async () => {
    mockRequireAuth.mockResolvedValue(staff)
    const res = await PUT(req({ selloDoble: window, traeUnAmigo: false }), params)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      selloDoble: { days: [1, 2], fromHour: 15, toHour: 18 },
      traeUnAmigo: false,
      texto: "Sello doble los lunes y martes de 15 a 18 h: cada visita suma 2 sellos.",
    })
    expect(mockUpdate).toHaveBeenCalledWith(
      programId,
      { $set: { doubleStamp: { days: [1, 2], fromHour: 15, toHour: 18 }, referralEnabled: false } },
      expect.objectContaining({ runValidators: true })
    )
    expect(mockRefresh).toHaveBeenCalledTimes(1)
  })

  it("removes it, and does nothing when nothing changed", async () => {
    mockRequireAuth.mockResolvedValue({ user: { id: "a", email: "admin@celimap.com.ar", role: "admin" } })
    expect((await PUT(req({ selloDoble: null, traeUnAmigo: false }), params)).status).toBe(200)
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(mockRefresh).not.toHaveBeenCalled()

    expect((await PUT(req({ selloDoble: null, traeUnAmigo: true }), params)).status).toBe(200)
    expect(mockUpdate).toHaveBeenLastCalledWith(
      programId,
      { $set: { referralEnabled: true }, $unset: { doubleStamp: 1 } },
      expect.anything()
    )
    expect(mockRefresh).toHaveBeenCalledTimes(1)

    mockGetProgram.mockResolvedValue({
      program: { ...program, doubleStamp: { days: [1, 2], fromHour: 15, toHour: 18 } },
      placeName: "Polvorín",
      placePath: "/lugar/polvorin",
    })
    expect((await PUT(req({ selloDoble: null, traeUnAmigo: false }), params)).status).toBe(200)
    expect(mockUpdate).toHaveBeenLastCalledWith(
      programId,
      { $set: { referralEnabled: false }, $unset: { doubleStamp: 1 } },
      expect.anything()
    )
  })
})
