/**
 * @jest-environment node
 */
import mongoose from "mongoose"

const mockFindOneAndUpdate = jest.fn()
const mockStampCreate = jest.fn()
jest.mock("@/lib/mongodb", () => ({ __esModule: true, default: jest.fn() }))
jest.mock("@/models/LoyaltyCard", () => ({
  LoyaltyCard: { findOneAndUpdate: (...a: unknown[]) => mockFindOneAndUpdate(...a) },
}))
jest.mock("@/models/LoyaltyStamp", () => ({
  LoyaltyStamp: { create: (...a: unknown[]) => mockStampCreate(...a) },
}))
jest.mock("@/models/LoyaltyProgram", () => ({ LoyaltyProgram: {} }))
jest.mock("@/models/Place", () => ({ Place: {} }))

import {
  STAMP_COOLDOWN_MS,
  addStamp,
  canManageProgram,
  isValidSerial,
  newAuthToken,
  newSerialNumber,
  parseApplePassAuth,
  passInputFor,
  passLocationFor,
  redeemReward,
  safeTokenEquals,
} from "@/lib/wallet/loyalty"
import type { ILoyaltyCard } from "@/models/LoyaltyCard"
import type { ILoyaltyProgram } from "@/models/LoyaltyProgram"

const program = {
  _id: new mongoose.Types.ObjectId(),
  stampsForReward: 5,
  reward: "Un café",
  staffEmails: ["caja@local.com"],
} as unknown as ILoyaltyProgram

const cardWith = (stamps: number) =>
  ({
    _id: new mongoose.Types.ObjectId(),
    serialNumber: newSerialNumber(),
    authToken: newAuthToken(),
    stamps,
  }) as unknown as ILoyaltyCard

describe("loyalty helpers", () => {
  beforeEach(() => jest.clearAllMocks())

  it("generates unguessable serials and long tokens", () => {
    const serial = newSerialNumber()
    expect(isValidSerial(serial)).toBe(true)
    expect(serial).not.toBe(newSerialNumber())
    expect(newAuthToken().length).toBeGreaterThanOrEqual(16)
    expect(isValidSerial("../etc")).toBe(false)
    expect(isValidSerial(undefined)).toBe(false)
  })

  it("only staff emails or admins can manage a program", () => {
    expect(canManageProgram(program, { user: { email: "Caja@Local.com", role: "user" } })).toBe(true)
    expect(canManageProgram(program, { user: { email: "cliente@gmail.com", role: "user" } })).toBe(false)
    expect(canManageProgram(program, { user: { email: "x@y.com", role: "admin" } })).toBe(true)
    expect(canManageProgram(program, null)).toBe(false)
    expect(canManageProgram(program, { user: { email: "", role: "user" } })).toBe(false)
  })

  it("parses the ApplePass header and compares tokens safely", () => {
    expect(parseApplePassAuth("ApplePass abc123")).toBe("abc123")
    expect(parseApplePassAuth("Bearer abc123")).toBeNull()
    expect(parseApplePassAuth(null)).toBeNull()
    expect(safeTokenEquals("abc", "abc")).toBe(true)
    expect(safeTokenEquals("abc", "abd")).toBe(false)
    expect(safeTokenEquals("abc", "abcd")).toBe(false)
  })

  it("puts the stamp URL in the QR and the web service on the pass", () => {
    const card = { ...cardWith(2), rewardsRedeemed: 1 } as unknown as ILoyaltyCard
    const input = passInputFor(card, {
      program,
      placeName: "Local",
      placePath: "/lugar/local",
      safety: "options",
      location: { latitude: -34.6, longitude: -58.4 },
    })
    expect(input.barcodeValue).toMatch(new RegExp(`/local/sellar/${card.serialNumber}$`))
    expect(input.webService?.url).toMatch(/\/api\/wallet\/apple$/)
    expect(input.webService?.authenticationToken).toBe(card.authToken)
    expect(input.stamps).toBe(2)
    expect(input.rewardsRedeemed).toBe(1)
    expect(input.safety).toBe("options")
    expect(input.location).toEqual({ latitude: -34.6, longitude: -58.4 })
  })

  it("only uses the place's location when it is exact", () => {
    expect(passLocationFor({ location: { lat: -34.6, lng: -58.4 } })).toEqual({ latitude: -34.6, longitude: -58.4 })
    expect(passLocationFor({ location: { lat: -34.6, lng: -58.4 }, locationPrecision: "exact" })).not.toBeNull()
    expect(passLocationFor({ location: { lat: -34.6, lng: -58.4 }, locationPrecision: "approx" })).toBeNull()
    expect(passLocationFor({})).toBeNull()
    expect(passLocationFor({ location: { lat: 0, lng: 0 } })).toBeNull()
    expect(passLocationFor({ location: { lat: 120, lng: -58.4 } })).toBeNull()
  })

  it("adds a stamp atomically with cap and cooldown", async () => {
    const card = cardWith(2)
    const now = new Date("2026-10-15T12:00:00Z")
    mockFindOneAndUpdate.mockResolvedValue({ ...card, stamps: 3 })
    const result = await addStamp(card, program, "caja@local.com", now)
    expect(result.ok).toBe(true)
    const [filter, update] = mockFindOneAndUpdate.mock.calls[0]
    expect(filter.stamps).toEqual({ $lt: 5 })
    expect(filter.$or[1].lastStampAt.$lt.getTime()).toBe(now.getTime() - STAMP_COOLDOWN_MS)
    expect(update.$inc).toEqual({ stamps: 1, totalStamps: 1 })
    expect(mockStampCreate).toHaveBeenCalledWith(expect.objectContaining({ kind: "stamp" }))
  })

  it("refuses to stamp a full card or twice in a row", async () => {
    expect(await addStamp(cardWith(5), program, "caja@local.com")).toEqual({ ok: false, reason: "full" })
    mockFindOneAndUpdate.mockResolvedValue(null)
    expect(await addStamp(cardWith(1), program, "caja@local.com")).toEqual({
      ok: false,
      reason: "too_soon",
    })
    expect(mockStampCreate).not.toHaveBeenCalled()
  })

  it("redeems only a complete card and resets it", async () => {
    mockFindOneAndUpdate.mockResolvedValue(null)
    expect(await redeemReward(cardWith(3), program, "caja@local.com")).toEqual({
      ok: false,
      reason: "not_ready",
    })
    mockFindOneAndUpdate.mockResolvedValue({ stamps: 0 })
    const result = await redeemReward(cardWith(5), program, "caja@local.com")
    expect(result.ok).toBe(true)
    const [filter, update] = mockFindOneAndUpdate.mock.calls[1]
    expect(filter.stamps).toEqual({ $gte: 5 })
    expect(update.$set).toEqual({ stamps: 0 })
    expect(mockStampCreate).toHaveBeenCalledWith(expect.objectContaining({ kind: "redeem" }))
  })
})
