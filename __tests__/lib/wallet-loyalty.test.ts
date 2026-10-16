/**
 * @jest-environment node
 */
import mongoose from "mongoose"

const mockFindOneAndUpdate = jest.fn()
const mockStampCreate = jest.fn()
jest.mock("@/lib/mongodb", () => ({ __esModule: true, default: jest.fn() }))
const mockCardExists = jest.fn()
const mockCardDistinct = jest.fn()
const mockCardCount = jest.fn()
const mockDeviceDistinct = jest.fn()
jest.mock("@/models/LoyaltyCard", () => ({
  LoyaltyCard: {
    findOneAndUpdate: (...a: unknown[]) => mockFindOneAndUpdate(...a),
    exists: (...a: unknown[]) => mockCardExists(...a),
    find: (...a: unknown[]) => ({ distinct: (field: string) => mockCardDistinct(field, ...a) }),
    countDocuments: (...a: unknown[]) => mockCardCount(...a),
  },
}))
jest.mock("@/models/LoyaltyDevice", () => ({
  LoyaltyDevice: { distinct: (...a: unknown[]) => mockDeviceDistinct(...a) },
}))
jest.mock("@/models/LoyaltyStamp", () => ({
  LoyaltyStamp: { create: (...a: unknown[]) => mockStampCreate(...a) },
}))
const mockProgramUpdate = jest.fn()
const mockProgramFindById = jest.fn()
jest.mock("@/models/LoyaltyProgram", () => ({
  LoyaltyProgram: {
    findOneAndUpdate: (...a: unknown[]) => mockProgramUpdate(...a),
    findById: (...a: unknown[]) => ({ select: () => ({ lean: () => mockProgramFindById(...a) }) }),
  },
}))
jest.mock("@/models/Place", () => ({ Place: {} }))

import {
  STAMP_COOLDOWN_MS,
  addStamp,
  canManageProgram,
  countCardsInWallet,
  findInviterCard,
  inviteUrlFor,
  isValidSerial,
  newAuthToken,
  newSerialNumber,
  parseApplePassAuth,
  passInputFor,
  passLocationFor,
  redeemReward,
  safeTokenEquals,
  saveProgramNotice,
} from "@/lib/wallet/loyalty"
import { NOTICE_COOLDOWN_MS } from "@/lib/wallet/notice"
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
      locations: [{ latitude: -34.6, longitude: -58.4 }],
      branches: [],
    })
    expect(input.notice).toBeNull()
    expect(input.barcodeValue).toMatch(new RegExp(`/local/sellar/${card.serialNumber}$`))
    expect(input.webService?.url).toMatch(/\/api\/wallet\/apple$/)
    expect(input.webService?.authenticationToken).toBe(card.authToken)
    expect(input.stamps).toBe(2)
    expect(input.rewardsRedeemed).toBe(1)
    expect(input.safety).toBe("options")
    expect(input.locations).toEqual([{ latitude: -34.6, longitude: -58.4 }])
    expect(input.branchNames).toEqual([])
  })

  it("puts the shop's notice on the card for a week", () => {
    const sentAt = new Date("2026-10-16T12:00:00Z")
    const withNotice = {
      ...program,
      notice: { text: "Salieron las medialunas", sentAt, byEmail: "caja@local.com" },
    } as unknown as ILoyaltyProgram
    const data = { program: withNotice, placeName: "Local", placePath: "/lugar/local", safety: null, locations: [], branches: [] }
    expect(passInputFor(cardWith(1), data, new Date("2026-10-17T12:00:00Z")).notice).toBe("Salieron las medialunas")
    expect(passInputFor(cardWith(1), data, new Date("2026-10-24T12:00:00Z")).notice).toBeNull()
  })

  it("saves one notice a day, atomically, only for active cards", async () => {
    const now = new Date("2026-10-16T12:00:00Z")
    mockProgramUpdate.mockResolvedValueOnce({ ...program, notice: { text: "Hola" } })
    expect((await saveProgramNotice(program._id, "Hola", "caja@local.com", now)).ok).toBe(true)
    const [filter, update] = mockProgramUpdate.mock.calls[0]
    expect(filter.active).toBe(true)
    expect(filter.$or[1]["notice.sentAt"].$lte.getTime()).toBe(now.getTime() - NOTICE_COOLDOWN_MS)
    expect(update.$set.notice).toEqual({ text: "Hola", sentAt: now, byEmail: "caja@local.com" })

    mockProgramUpdate.mockResolvedValue(null)
    const sentAt = new Date(now.getTime() - 60 * 60 * 1000)
    mockProgramFindById.mockResolvedValueOnce({ active: true, notice: { text: "x", sentAt, byEmail: "a" } })
    expect(await saveProgramNotice(program._id, "Hola", "caja@local.com", now)).toEqual({
      ok: false,
      reason: "too_soon",
      nextAt: new Date(sentAt.getTime() + NOTICE_COOLDOWN_MS),
    })
    mockProgramFindById.mockResolvedValueOnce({ active: false })
    expect(await saveProgramNotice(program._id, "Hola", "caja@local.com", now)).toEqual({
      ok: false,
      reason: "paused",
    })
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
    expect(result).toMatchObject({ ok: true, added: 1 })
    const [filter, update] = mockFindOneAndUpdate.mock.calls[0]
    // Si la tarjeta cambió en el medio (otro sello, un canje), no suma.
    expect(filter.stamps).toBe(2)
    expect(filter.$or[1].lastStampAt.$lt.getTime()).toBe(now.getTime() - STAMP_COOLDOWN_MS)
    expect(update.$inc).toEqual({ stamps: 1, totalStamps: 1, visits: 1 })
    expect(update.$set).toEqual({ lastStampAt: now, lastStampAdded: 1 })
    expect(update.$unset).toEqual({ lastStampReason: 1 })
    expect(mockStampCreate).toHaveBeenCalledWith(expect.objectContaining({ kind: "stamp", count: 1 }))
  })

  it("counts two stamps on the same day as one visit", async () => {
    const now = new Date("2026-10-16T20:00:00Z")
    const card = { ...cardWith(2), lastStampAt: new Date("2026-10-16T13:00:00Z") } as unknown as ILoyaltyCard
    mockFindOneAndUpdate.mockResolvedValue({ ...card, stamps: 3 })
    await addStamp(card, program, "caja@local.com", now)
    expect(mockFindOneAndUpdate.mock.calls[0][1].$inc).toEqual({ stamps: 1, totalStamps: 1 })

    // Ayer a las 23 h en Argentina (02:00 UTC de hoy) es otro día.
    const yesterday = { ...cardWith(2), lastStampAt: new Date("2026-10-16T02:00:00Z") } as unknown as ILoyaltyCard
    await addStamp(yesterday, program, "caja@local.com", now)
    expect(mockFindOneAndUpdate.mock.calls[1][1].$inc).toEqual({ stamps: 1, totalStamps: 1, visits: 1 })
  })

  it("adds 2 stamps during the shop's double-stamp hours", async () => {
    const card = cardWith(2)
    // Jueves 15/10 a las 15 h en Argentina.
    const now = new Date("2026-10-15T18:00:00Z")
    const withDouble = { ...program, doubleStamp: { days: [4], fromHour: 14, toHour: 17 } } as unknown as ILoyaltyProgram
    mockFindOneAndUpdate.mockResolvedValue({ ...card, stamps: 4 })
    const result = await addStamp(card, withDouble, "caja@local.com", now)
    expect(result).toMatchObject({ ok: true, added: 2, bonus: "double" })
    const [, update] = mockFindOneAndUpdate.mock.calls[0]
    expect(update.$inc).toEqual({ stamps: 2, totalStamps: 2, visits: 1 })
    expect(update.$set).toEqual({ lastStampAt: now, lastStampAdded: 2, lastStampReason: "double" })
    expect(update.$unset).toBeUndefined()
    expect(mockStampCreate).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "stamp", count: 2, bonus: "double" })
    )
  })

  it("puts the double-stamp hours and the last stamp on the card", () => {
    const withDouble = { ...program, doubleStamp: { days: [1, 2, 3, 4, 5], fromHour: 15, toHour: 18 } } as unknown as ILoyaltyProgram
    const card = { ...cardWith(3), lastStampAdded: 2, lastStampReason: "double" } as unknown as ILoyaltyCard
    const input = passInputFor(card, { program: withDouble, placeName: "Local", placePath: "/lugar/local", safety: null, locations: [], branches: [] })
    expect(input.doubleStamp).toBe("Sello doble de lunes a viernes de 15 a 18 h: cada visita suma 2 sellos.")
    expect(input.lastStampAdded).toBe(2)
    expect(input.lastStampReason).toBe("double")
  })

  it("gives the invited friend and the inviter a stamp on the friend's first visit", async () => {
    const inviterId = new mongoose.Types.ObjectId()
    const card = { ...cardWith(0), totalStamps: 0, referredBy: inviterId } as unknown as ILoyaltyCard
    const now = new Date("2026-10-15T12:00:00Z")
    mockFindOneAndUpdate
      .mockResolvedValueOnce({ ...card, stamps: 2 })
      .mockResolvedValueOnce({ _id: inviterId, serialNumber: "inv", stamps: 4 })
    const result = await addStamp(card, program, "caja@local.com", now)
    expect(result).toMatchObject({ ok: true, added: 2, bonus: "friend", inviter: { serialNumber: "inv" } })

    const [filter, update] = mockFindOneAndUpdate.mock.calls[0]
    expect(filter.referralRewardedAt).toEqual({ $exists: false })
    expect(update.$inc).toEqual({ stamps: 2, totalStamps: 2, visits: 1 })
    expect(update.$set).toMatchObject({ lastStampReason: "friend", referralRewardedAt: now })

    const [inviterFilter, inviterUpdate] = mockFindOneAndUpdate.mock.calls[1]
    expect(inviterFilter).toMatchObject({ _id: inviterId, programId: program._id, stamps: { $lt: 5 } })
    expect(inviterFilter.$or[1]).toEqual({ referralsRewarded: { $lt: 5 } })
    expect(inviterUpdate.$inc).toEqual({ stamps: 1, totalStamps: 1, referralsRewarded: 1 })
    expect(inviterUpdate.$set).toEqual({ lastStampAdded: 1, lastStampReason: "inviter" })
    expect(mockStampCreate).toHaveBeenCalledWith(expect.objectContaining({ bonus: "friend", count: 2 }))
    expect(mockStampCreate).toHaveBeenCalledWith(
      expect.objectContaining({ cardId: inviterId, bonus: "inviter", count: 1 })
    )
  })

  it("still stamps the friend when the inviter's card is full or hit the cap", async () => {
    const card = { ...cardWith(0), totalStamps: 0, referredBy: new mongoose.Types.ObjectId() } as unknown as ILoyaltyCard
    mockFindOneAndUpdate.mockResolvedValueOnce({ ...card, stamps: 2 }).mockResolvedValueOnce(null)
    const result = await addStamp(card, program, "caja@local.com")
    expect(result).toMatchObject({ ok: true, added: 2 })
    expect(result).not.toHaveProperty("inviter")
    expect(mockStampCreate).toHaveBeenCalledTimes(1)
  })

  it("only accepts invite links of the same place, with the promo on", async () => {
    const amigo = new mongoose.Types.ObjectId().toString()
    const on = { _id: program._id, referralEnabled: true } as unknown as ILoyaltyProgram
    mockCardExists.mockResolvedValueOnce({ _id: amigo })
    expect((await findInviterCard(on, amigo))?.toString()).toBe(amigo)
    expect(mockCardExists).toHaveBeenCalledWith({ _id: amigo, programId: program._id })

    mockCardExists.mockResolvedValueOnce(null)
    expect(await findInviterCard(on, amigo)).toBeNull()
    expect(await findInviterCard(on, "no-es-un-id")).toBeNull()
    expect(await findInviterCard(on, null)).toBeNull()
    expect(await findInviterCard({ ...on, referralEnabled: false } as unknown as ILoyaltyProgram, amigo)).toBeNull()
    expect(mockCardExists).toHaveBeenCalledTimes(2)
  })

  it("puts the invite link on the card only when the shop has the promo", () => {
    const card = cardWith(1)
    const data = { program, placeName: "Local", placePath: "/lugar/local", safety: null, locations: [], branches: [] }
    expect(passInputFor(card, data).inviteUrl).toBeNull()
    const on = { ...data, program: { ...program, referralEnabled: true } as unknown as ILoyaltyProgram }
    const url = passInputFor(card, on).inviteUrl
    expect(url).toBe(inviteUrlFor(program._id.toString(), card._id.toString()))
    expect(url).toMatch(new RegExp(`/tarjeta/${program._id}\\?amigo=${card._id}$`))
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

  it("counts as 'in the Wallet' only Apple cards an iPhone registered, plus Google cards", async () => {
    mockCardDistinct.mockResolvedValue(["a1", "a2", "a3"])
    mockCardCount.mockResolvedValue(2)
    mockDeviceDistinct.mockResolvedValue(["a2"])
    expect(await countCardsInWallet(program._id)).toBe(3)
    // iPhones distintos, no tarjetas: dos tarjetas en el mismo iPhone cuentan una vez.
    expect(mockDeviceDistinct).toHaveBeenCalledWith("deviceLibraryIdentifier", {
      serialNumber: { $in: ["a1", "a2", "a3"] },
    })
    expect(mockCardCount).toHaveBeenCalledWith({ programId: program._id, wallet: "google" })
  })
})
