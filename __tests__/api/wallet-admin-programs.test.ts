/**
 * @jest-environment node
 */
import { NextRequest, NextResponse } from "next/server"

const mockRequireAdmin = jest.fn()
jest.mock("@/lib/middleware", () => ({
  requireAdmin: (...a: unknown[]) => mockRequireAdmin(...a),
}))
jest.mock("@/lib/mongodb", () => ({ __esModule: true, default: jest.fn() }))
const mockPlaceExists = jest.fn()
jest.mock("@/models/Place", () => ({ Place: { exists: (...a: unknown[]) => mockPlaceExists(...a) } }))
const mockProgramExists = jest.fn()
const mockCreate = jest.fn()
const mockUpdate = jest.fn()
jest.mock("@/models/LoyaltyProgram", () => ({
  LoyaltyProgram: {
    exists: (...a: unknown[]) => mockProgramExists(...a),
    create: (...a: unknown[]) => mockCreate(...a),
    findByIdAndUpdate: (...a: unknown[]) => mockUpdate(...a),
  },
}))
jest.mock("@/models/LoyaltyCard", () => ({ LoyaltyCard: {} }))
jest.mock("@/models/LoyaltyStamp", () => ({ LoyaltyStamp: {} }))

import { POST } from "@/app/api/admin/wallet/programs/route"
import { PATCH } from "@/app/api/admin/wallet/programs/[id]/route"

const PLACE_ID = "507f1f77bcf86cd799439011"
const PROGRAM_ID = "507f1f77bcf86cd799439012"
const ADMIN = { user: { id: "u", email: "a@x.com", role: "admin" } }
const post = (body: unknown) =>
  new NextRequest("http://localhost:3000/api/admin/wallet/programs", {
    method: "POST",
    body: JSON.stringify(body),
  })
const patch = (body: unknown) =>
  new NextRequest(`http://localhost:3000/api/admin/wallet/programs/${PROGRAM_ID}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  })
const valid = {
  placeId: PLACE_ID,
  stampsForReward: 5,
  reward: "Un café de regalo",
  staffEmails: ["Caja@Local.com", "caja@local.com"],
}

describe("admin loyalty programs API", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireAdmin.mockResolvedValue(ADMIN)
    mockPlaceExists.mockResolvedValue({ _id: PLACE_ID })
    mockProgramExists.mockResolvedValue(null)
    mockCreate.mockResolvedValue({ _id: PROGRAM_ID })
    mockUpdate.mockResolvedValue({ _id: PROGRAM_ID })
  })

  it("requires admin", async () => {
    mockRequireAdmin.mockResolvedValue(NextResponse.json({}, { status: 403 }))
    expect((await POST(post(valid))).status).toBe(403)
    expect((await PATCH(patch({ active: false }), { params: { id: PROGRAM_ID } })).status).toBe(403)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it("creates a program with normalized, unique staff emails", async () => {
    expect((await POST(post(valid))).status).toBe(201)
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ staffEmails: ["caja@local.com"], active: true })
    )
  })

  it("validates input", async () => {
    expect((await POST(post({ ...valid, staffEmails: ["no-es-mail"] }))).status).toBe(400)
    expect((await POST(post({ ...valid, stampsForReward: 0 }))).status).toBe(400)
    expect((await POST(post({ ...valid, placeId: "x" }))).status).toBe(400)
  })

  it("allows only one program per place", async () => {
    mockProgramExists.mockResolvedValue({ _id: PROGRAM_ID })
    expect((await POST(post(valid))).status).toBe(409)
  })

  it("pauses a program without deleting it", async () => {
    const res = await PATCH(patch({ active: false }), { params: { id: PROGRAM_ID } })
    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith(PROGRAM_ID, { $set: { active: false } }, expect.anything())
    expect((await PATCH(patch({}), { params: { id: PROGRAM_ID } })).status).toBe(400)
  })
})
