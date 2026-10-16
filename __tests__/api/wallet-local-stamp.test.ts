/**
 * @jest-environment node
 */
import { NextRequest, NextResponse } from "next/server"
import mongoose from "mongoose"

const mockRequireAuth = jest.fn()
jest.mock("@/lib/middleware", () => ({
  requireAuth: (...a: unknown[]) => mockRequireAuth(...a),
}))
jest.mock("@/lib/mongodb", () => ({ __esModule: true, default: jest.fn() }))

const mockCardFindOne = jest.fn()
const mockCardUpdate = jest.fn()
const mockProgramFindById = jest.fn()
jest.mock("@/models/LoyaltyCard", () => ({
  LoyaltyCard: {
    findOne: (...a: unknown[]) => mockCardFindOne(...a),
    findOneAndUpdate: (...a: unknown[]) => mockCardUpdate(...a),
  },
}))
jest.mock("@/models/LoyaltyProgram", () => ({
  LoyaltyProgram: { findById: (...a: unknown[]) => mockProgramFindById(...a) },
}))
jest.mock("@/models/LoyaltyStamp", () => ({ LoyaltyStamp: { create: jest.fn() } }))
jest.mock("@/models/Place", () => ({ Place: {} }))
const mockNotify = jest.fn()
jest.mock("@/lib/wallet/notify", () => ({
  notifyCardChanged: (...a: unknown[]) => mockNotify(...a),
}))

import { POST } from "@/app/api/local/tarjetas/[serial]/route"

const SERIAL = "a".repeat(32)
const req = (body: unknown) =>
  new NextRequest(`http://localhost:3000/api/local/tarjetas/${SERIAL}`, {
    method: "POST",
    body: JSON.stringify(body),
  })
const params = { params: { serial: SERIAL } }

describe("POST /api/local/tarjetas/[serial]", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCardUpdate.mockResolvedValue({ serialNumber: "s", stamps: 3, rewardsRedeemed: 0 })
    mockCardFindOne.mockResolvedValue({ _id: new mongoose.Types.ObjectId(), programId: "p1", stamps: 2 })
    mockProgramFindById.mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      stampsForReward: 5,
      staffEmails: ["caja@local.com"],
    })
  })

  it("requires a session", async () => {
    mockRequireAuth.mockResolvedValue(NextResponse.json({}, { status: 401 }))
    expect((await POST(req({ accion: "sello" }), params)).status).toBe(401)
  })

  it("blocks customers and other users", async () => {
    mockRequireAuth.mockResolvedValue({ user: { id: "u", email: "cliente@gmail.com", role: "user" } })
    expect((await POST(req({ accion: "sello" }), params)).status).toBe(403)
    expect(mockNotify).not.toHaveBeenCalled()
  })

  it("rejects bad actions", async () => {
    mockRequireAuth.mockResolvedValue({ user: { id: "u", email: "caja@local.com", role: "user" } })
    expect((await POST(req({ accion: "borrar" }), params)).status).toBe(400)
  })

  it("lets staff add a stamp and notifies the Wallet", async () => {
    mockRequireAuth.mockResolvedValue({ user: { id: "u", email: "caja@local.com", role: "user" } })
    const res = await POST(req({ accion: "sello" }), params)
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ stamps: 3, stampsForReward: 5 })
    expect(mockNotify).toHaveBeenCalledWith(expect.objectContaining({ serialNumber: "s", stamps: 3 }))
  })

  it("also updates the card of the friend who invited them", async () => {
    mockRequireAuth.mockResolvedValue({ user: { id: "u", email: "caja@local.com", role: "user" } })
    mockCardFindOne.mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      programId: "p1",
      stamps: 0,
      totalStamps: 0,
      referredBy: new mongoose.Types.ObjectId(),
    })
    mockCardUpdate
      .mockResolvedValueOnce({ serialNumber: "amigo", stamps: 2, totalStamps: 2, referralRewardedAt: new Date() })
      .mockResolvedValueOnce({ serialNumber: "invito", stamps: 4 })
    const res = await POST(req({ accion: "sello" }), params)
    expect(await res.json()).toMatchObject({ stamps: 2, added: 2, bonus: "friend", inviterRewarded: true, next: { added: 1 } })
    expect(mockNotify).toHaveBeenCalledTimes(2)
    expect(mockNotify).toHaveBeenCalledWith(expect.objectContaining({ serialNumber: "invito" }))
  })
})
