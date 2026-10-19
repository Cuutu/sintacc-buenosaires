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
  LoyaltyProgram: { findOneAndUpdate: (...a: unknown[]) => mockUpdate(...a) },
}))
const mockGetProgram = jest.fn()
jest.mock("@/lib/wallet/loyalty", () => ({
  ...jest.requireActual("@/lib/wallet/loyalty"),
  getProgramWithPlace: (...a: unknown[]) => mockGetProgram(...a),
}))
const mockNotify = jest.fn()
jest.mock("@/lib/wallet/notify", () => ({
  notifyRewardChanged: (...a: unknown[]) => mockNotify(...a),
}))

import { PUT } from "@/app/api/local/programas/[programaId]/premio/route"
import { REWARD_CHANGE_COOLDOWN_MS } from "@/lib/wallet/reward-change"

const programId = new mongoose.Types.ObjectId()
const req = (body: unknown) =>
  new NextRequest(`http://localhost:3000/api/local/programas/${programId}/premio`, {
    method: "PUT",
    body: JSON.stringify(body),
  })
const params = { params: { programaId: programId.toString() } }
const baseProgram = {
  _id: programId,
  staffEmails: ["duenio@polvorin.com"],
  employeeEmails: ["caja@polvorin.com"],
  stampsForReward: 10,
  reward: "Cookie",
  active: true,
}
const manager = { user: { id: "u1", email: "Duenio@Polvorin.com", role: "user" } }
const employee = { user: { id: "u2", email: "caja@polvorin.com", role: "user" } }
const admin = { user: { id: "u3", email: "franco@celimap.com.ar", role: "admin" } }
const change = { stampsForReward: 8, reward: "Café con medialuna" }

function setProgram(extra: Record<string, unknown> = {}) {
  const program = { ...baseProgram, ...extra }
  mockGetProgram.mockResolvedValue({ program, placeName: "Polvorín", placePath: "/lugar/polvorin" })
  return program
}

describe("PUT /api/local/programas/[programaId]/premio", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setProgram()
    mockUpdate.mockImplementation(async (_filter, update: { $set: Record<string, unknown> }) => ({
      ...baseProgram,
      ...update.$set,
    }))
  })

  it("requires a session", async () => {
    mockRequireAuth.mockResolvedValue(NextResponse.json({}, { status: 401 }))
    expect((await PUT(req(change), params)).status).toBe(401)
  })

  it("is only for managers: employees and customers can't change it", async () => {
    mockRequireAuth.mockResolvedValue(employee)
    expect((await PUT(req(change), params)).status).toBe(403)
    mockRequireAuth.mockResolvedValue({ user: { id: "u9", email: "cliente@gmail.com", role: "user" } })
    expect((await PUT(req(change), params)).status).toBe(403)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it("validates the stamps and the reward", async () => {
    mockRequireAuth.mockResolvedValue(manager)
    expect((await PUT(req({ stampsForReward: 0, reward: "Cookie" }), params)).status).toBe(400)
    expect((await PUT(req({ stampsForReward: 21, reward: "Cookie" }), params)).status).toBe(400)
    expect((await PUT(req({ stampsForReward: 5, reward: " " }), params)).status).toBe(400)
    expect((await PUT(req({ stampsForReward: 10, reward: "Cookie" }), params)).status).toBe(400)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it("saves the change, starts the 15 days and tells the customers", async () => {
    mockRequireAuth.mockResolvedValue(manager)
    const res = await PUT(req(change), params)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ stampsForReward: 8, reward: "Café con medialuna" })
    expect(typeof body.nextAt).toBe("string")
    const [filter, update] = mockUpdate.mock.calls[0]
    expect(filter).toMatchObject({ _id: programId })
    expect(filter.$or).toBeDefined()
    expect(update.$set).toMatchObject({
      stampsForReward: 8,
      reward: "Café con medialuna",
      rewardChangedAt: expect.any(Date),
      shopRewardChangedAt: expect.any(Date),
    })
    expect(mockNotify).toHaveBeenCalledTimes(1)
    expect(mockNotify.mock.calls[0][0].program).toMatchObject({ stampsForReward: 8 })
  })

  it("lets the shop change it only once every 15 days", async () => {
    mockRequireAuth.mockResolvedValue(manager)
    setProgram({ shopRewardChangedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) })
    const res = await PUT(req(change), params)
    expect(res.status).toBe(429)
    expect((await res.json()).error).toMatch(/Vas a poder cambiarlo de nuevo el/)
    expect(mockUpdate).not.toHaveBeenCalled()

    setProgram({ shopRewardChangedAt: new Date(Date.now() - REWARD_CHANGE_COOLDOWN_MS - 1000) })
    expect((await PUT(req(change), params)).status).toBe(200)
  })

  it("answers 429 if another change won the race", async () => {
    mockRequireAuth.mockResolvedValue(manager)
    mockUpdate.mockResolvedValue(null)
    expect((await PUT(req(change), params)).status).toBe(429)
    expect(mockNotify).not.toHaveBeenCalled()
  })

  it("an admin can change it anytime without starting the shop's 15 days", async () => {
    mockRequireAuth.mockResolvedValue(admin)
    setProgram({ shopRewardChangedAt: new Date() })
    const res = await PUT(req(change), params)
    expect(res.status).toBe(200)
    const [filter, update] = mockUpdate.mock.calls[0]
    expect(filter).toEqual({ _id: programId })
    expect(update.$set.shopRewardChangedAt).toBeUndefined()
    expect(mockNotify).toHaveBeenCalledTimes(1)
  })
})
