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
const mockPlaceCount = jest.fn()
jest.mock("@/models/Place", () => ({
  Place: {
    exists: (...a: unknown[]) => mockPlaceExists(...a),
    countDocuments: (...a: unknown[]) => mockPlaceCount(...a),
  },
}))
const mockProgramExists = jest.fn()
const mockProgramFindById = jest.fn()
const mockProgramDelete = jest.fn()
const mockCardFind = jest.fn()
const mockCardDelete = jest.fn()
const mockStampDelete = jest.fn()
const mockDeviceDelete = jest.fn()
const mockExpire = jest.fn()
const mockGoogleConfig = jest.fn()
const mockCreate = jest.fn()
const mockUpdate = jest.fn()
jest.mock("@/models/LoyaltyProgram", () => ({
  LoyaltyProgram: {
    exists: (...a: unknown[]) => mockProgramExists(...a),
    create: (...a: unknown[]) => mockCreate(...a),
    findByIdAndUpdate: (...a: unknown[]) => mockUpdate(...a),
    findById: (...a: unknown[]) => ({ select: () => ({ lean: () => mockProgramFindById(...a) }) }),
    deleteOne: (...a: unknown[]) => mockProgramDelete(...a),
  },
}))
jest.mock("@/models/LoyaltyCard", () => ({
  LoyaltyCard: {
    find: (...a: unknown[]) => ({ select: () => ({ lean: () => mockCardFind(...a) }) }),
    deleteMany: (...a: unknown[]) => mockCardDelete(...a),
  },
}))
jest.mock("@/models/LoyaltyStamp", () => ({
  LoyaltyStamp: { deleteMany: (...a: unknown[]) => mockStampDelete(...a) },
}))
jest.mock("@/models/LoyaltyDevice", () => ({
  LoyaltyDevice: { deleteMany: (...a: unknown[]) => mockDeviceDelete(...a) },
}))
jest.mock("@/lib/wallet/config", () => ({ getGoogleWalletConfig: () => mockGoogleConfig() }))
jest.mock("@/lib/wallet/google-wallet", () => ({
  expireGoogleCards: (...a: unknown[]) => mockExpire(...a),
}))
const mockNotifyReward = jest.fn()
const mockRefresh = jest.fn()
jest.mock("@/lib/wallet/notify", () => ({
  notifyRewardChanged: (...a: unknown[]) => mockNotifyReward(...a),
  refreshProgramCards: (...a: unknown[]) => mockRefresh(...a),
}))
const mockGetData = jest.fn()
jest.mock("@/lib/wallet/loyalty", () => ({
  ...jest.requireActual("@/lib/wallet/loyalty"),
  getProgramWithPlace: (...a: unknown[]) => mockGetData(...a),
}))

import { POST } from "@/app/api/admin/wallet/programs/route"
import { DELETE, PATCH } from "@/app/api/admin/wallet/programs/[id]/route"

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
    mockProgramFindById.mockResolvedValue({
      _id: PROGRAM_ID,
      placeId: PLACE_ID,
      stampsForReward: 5,
      reward: "Un café de regalo",
    })
    mockGetData.mockResolvedValue({ program: { _id: PROGRAM_ID } })
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

  it("changing the stamps or the reward updates the saved cards and tells the customers", async () => {
    const res = await PATCH(patch({ stampsForReward: 8 }), { params: { id: PROGRAM_ID } })
    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith(
      PROGRAM_ID,
      { $set: { stampsForReward: 8, rewardChangedAt: expect.any(Date) } },
      expect.anything()
    )
    expect(mockNotifyReward).toHaveBeenCalledWith({ program: { _id: PROGRAM_ID } })
    expect(mockRefresh).not.toHaveBeenCalled()
  })

  it("saving the same stamps and reward does not notify anyone", async () => {
    await PATCH(patch({ stampsForReward: 5, reward: "Un café de regalo", active: true }), {
      params: { id: PROGRAM_ID },
    })
    expect(mockUpdate).toHaveBeenCalledWith(
      PROGRAM_ID,
      { $set: { stampsForReward: 5, reward: "Un café de regalo", active: true } },
      expect.anything()
    )
    expect(mockNotifyReward).not.toHaveBeenCalled()
  })

  it("saves employees (they only add stamps)", async () => {
    await PATCH(patch({ employeeEmails: ["Caja@Local.com"] }), { params: { id: PROGRAM_ID } })
    expect(mockUpdate).toHaveBeenCalledWith(
      PROGRAM_ID,
      { $set: { employeeEmails: ["caja@local.com"] } },
      expect.anything()
    )
  })

  describe("team and branches", () => {
    const BRANCH_ID = "507f1f77bcf86cd799439013"
    const OTHER_BRANCH_ID = "507f1f77bcf86cd799439014"
    const params = { params: { id: PROGRAM_ID } }

    beforeEach(() => {
      mockPlaceCount.mockImplementation(async (q: { _id: { $in: string[] } }) => q._id.$in.length)
      mockProgramFindById.mockResolvedValue({
        _id: PROGRAM_ID,
        placeId: PLACE_ID,
        stampsForReward: 5,
        reward: "Un café de regalo",
        brandName: "Polvorín",
        branches: [{ placeId: BRANCH_ID }],
      })
    })

    it("adding someone to a branch saves it without touching the customers' cards", async () => {
      const res = await PATCH(patch({ branches: [{ placeId: BRANCH_ID, staffEmails: ["Mozo@Local.com"] }] }), params)
      expect(res.status).toBe(200)
      expect(mockUpdate).toHaveBeenCalledWith(
        PROGRAM_ID,
        { $set: { branches: [{ placeId: BRANCH_ID, staffEmails: ["mozo@local.com"] }] } },
        expect.anything()
      )
      expect(mockRefresh).not.toHaveBeenCalled()
      expect(mockNotifyReward).not.toHaveBeenCalled()
    })

    it("adding or removing a branch updates the cards (where they work)", async () => {
      await PATCH(
        patch({
          branches: [
            { placeId: BRANCH_ID, staffEmails: [] },
            { placeId: OTHER_BRANCH_ID, staffEmails: [] },
          ],
        }),
        params
      )
      expect(mockRefresh).toHaveBeenCalledTimes(1)
      mockRefresh.mockClear()
      await PATCH(patch({ branches: [] }), params)
      expect(mockRefresh).toHaveBeenCalledTimes(1)
    })

    it("renaming the brand updates the cards; saving the same name does not", async () => {
      await PATCH(patch({ brandName: "Polvorín" }), params)
      expect(mockRefresh).not.toHaveBeenCalled()
      await PATCH(patch({ brandName: "Polvorín Café" }), params)
      expect(mockRefresh).toHaveBeenCalledTimes(1)
    })

    it("managers and employees of the main place never touch the cards", async () => {
      await PATCH(patch({ staffEmails: ["duenio@local.com"], employeeEmails: ["caja@local.com"] }), params)
      expect(mockRefresh).not.toHaveBeenCalled()
      expect(mockNotifyReward).not.toHaveBeenCalled()
    })
  })

  it("pauses a program (it does not delete it)", async () => {
    const res = await PATCH(patch({ active: false }), { params: { id: PROGRAM_ID } })
    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith(PROGRAM_ID, { $set: { active: false } }, expect.anything())
    expect((await PATCH(patch({}), { params: { id: PROGRAM_ID } })).status).toBe(400)
  })

  describe("DELETE", () => {
    const del = (body: unknown) =>
      new NextRequest(`http://localhost:3000/api/admin/wallet/programs/${PROGRAM_ID}`, {
        method: "DELETE",
        body: JSON.stringify(body),
      })
    const params = { params: { id: PROGRAM_ID } }

    beforeEach(() => {
      mockProgramFindById.mockResolvedValue({ _id: PROGRAM_ID })
      mockCardFind.mockResolvedValue([
        { serialNumber: "a1", wallet: "apple" },
        { serialNumber: "g1", wallet: "google" },
      ])
      mockStampDelete.mockResolvedValue({ deletedCount: 7 })
      mockGoogleConfig.mockReturnValue({ issuerId: "1" })
    })

    it("requires admin and the written confirmation", async () => {
      mockRequireAdmin.mockResolvedValueOnce(NextResponse.json({}, { status: 403 }))
      expect((await DELETE(del({ confirmar: "BORRAR" }), params)).status).toBe(403)
      const res = await DELETE(del({ confirmar: "borrar" }), params)
      expect(res.status).toBe(400)
      expect((await res.json()).error).toBe("Escribí BORRAR para confirmar.")
      expect(mockProgramDelete).not.toHaveBeenCalled()
    })

    it("deletes the program with its cards, stamps and iPhone registrations", async () => {
      const res = await DELETE(del({ confirmar: "BORRAR" }), params)
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ ok: true, tarjetas: 2, sellos: 7 })
      expect(mockProgramDelete).toHaveBeenCalledWith({ _id: PROGRAM_ID })
      expect(mockDeviceDelete).toHaveBeenCalledWith({ serialNumber: { $in: ["a1", "g1"] } })
      expect(mockStampDelete).toHaveBeenCalledWith({ programId: PROGRAM_ID })
      expect(mockCardDelete).toHaveBeenCalledWith({ programId: PROGRAM_ID })
      expect(mockExpire).toHaveBeenCalledWith(["g1"], { issuerId: "1" })
    })

    it("answers 404 for a program that does not exist", async () => {
      mockProgramFindById.mockResolvedValue(null)
      expect((await DELETE(del({ confirmar: "BORRAR" }), params)).status).toBe(404)
      expect(mockCardDelete).not.toHaveBeenCalled()
    })
  })
})
