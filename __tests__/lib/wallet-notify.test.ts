/**
 * @jest-environment node
 */
import mongoose from "mongoose"

const mockApplePush = jest.fn()
const mockApplePushMany = jest.fn()
const mockGooglePush = jest.fn()
const mockGoogleNotice = jest.fn()
const mockGetProgram = jest.fn()
const mockUpdateMany = jest.fn()
const mockCardFind = jest.fn()
const mockGoogleRefresh = jest.fn()
const mockGoogleClass = jest.fn()
jest.mock("@/lib/mongodb", () => ({ __esModule: true, default: jest.fn() }))
jest.mock("@/lib/logger", () => ({ logger: { warn: jest.fn() } }))
jest.mock("@/models/LoyaltyCard", () => ({
  LoyaltyCard: {
    updateMany: (...a: unknown[]) => mockUpdateMany(...a),
    find: (...a: unknown[]) => ({
      select: () => ({ lean: () => mockCardFind(...a) }),
      sort: () => ({ limit: () => mockCardFind(...a) }),
    }),
  },
}))
jest.mock("@/lib/wallet/apple-push", () => ({
  notifyPassUpdated: (...a: unknown[]) => mockApplePush(...a),
  notifyPassesUpdated: (...a: unknown[]) => mockApplePushMany(...a),
}))
jest.mock("@/lib/wallet/google-wallet", () => ({
  pushGoogleCardUpdate: (...a: unknown[]) => mockGooglePush(...a),
  pushGoogleProgramNotice: (...a: unknown[]) => mockGoogleNotice(...a),
  refreshGoogleCard: (...a: unknown[]) => mockGoogleRefresh(...a),
  refreshGoogleClass: (...a: unknown[]) => mockGoogleClass(...a),
}))
jest.mock("@/lib/wallet/config", () => ({
  getApplePassConfig: () => ({ passTypeIdentifier: "p" }),
  getGoogleWalletConfig: () => ({ issuerId: "1" }),
}))
jest.mock("@/lib/wallet/loyalty", () => ({
  getProgramWithPlace: (...a: unknown[]) => mockGetProgram(...a),
  passInputFor: (card: { serialNumber: string }) => ({ serialNumber: card.serialNumber }),
}))

import { notifyCardChanged, notifyProgramNotice, refreshProgramCards } from "@/lib/wallet/notify"
import type { ProgramWithPlace } from "@/lib/wallet/loyalty"
import type { ILoyaltyCard } from "@/models/LoyaltyCard"

const programId = new mongoose.Types.ObjectId()
const card = (wallet?: "apple" | "google") =>
  ({ programId, serialNumber: "s1", stamps: 2, wallet }) as unknown as ILoyaltyCard

describe("notifyCardChanged", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetProgram.mockResolvedValue({ program: { _id: programId }, placeName: "Local", placePath: "/lugar/local" })
  })

  it("pushes Apple cards through APNs (also the ones from before Google)", async () => {
    await notifyCardChanged(card())
    await notifyCardChanged(card("apple"))
    expect(mockApplePush).toHaveBeenCalledTimes(2)
    expect(mockApplePush).toHaveBeenCalledWith("s1", expect.anything())
    expect(mockGooglePush).not.toHaveBeenCalled()
  })

  it("updates Google cards through the Wallet API", async () => {
    await notifyCardChanged(card("google"))
    expect(mockGooglePush).toHaveBeenCalledWith(
      expect.objectContaining({ serialNumber: "s1", programId: programId.toString() }),
      expect.anything()
    )
    expect(mockApplePush).not.toHaveBeenCalled()
  })
})

describe("notifyProgramNotice", () => {
  beforeEach(() => jest.clearAllMocks())

  it("marks the Apple cards as changed, wakes the iPhones and messages the Google class", async () => {
    mockCardFind.mockResolvedValue([{ serialNumber: "s1" }, { serialNumber: "s2" }])
    const now = new Date("2026-10-16T12:00:00Z")
    const data = {
      program: { _id: programId },
      placeName: "Polvorín",
      placePath: "/lugar/polvorin",
      safety: "dedicated",
      locations: [],
    } as unknown as ProgramWithPlace
    await notifyProgramNotice(data, "Salieron las medialunas", now)

    const [filter, update, options] = mockUpdateMany.mock.calls[0]
    expect(filter).toEqual({ programId, wallet: { $ne: "google" } })
    expect(update).toEqual({ $set: { updatedAt: now } })
    expect(options).toEqual({ timestamps: false })
    expect(mockApplePushMany).toHaveBeenCalledWith(["s1", "s2"], expect.anything())
    expect(mockGoogleNotice).toHaveBeenCalledWith(
      { programId: programId.toString(), placeName: "Polvorín", safety: "dedicated", locations: [] },
      "Salieron las medialunas",
      expect.anything(),
      now
    )
  })

  it("still tries Google when Apple fails", async () => {
    mockUpdateMany.mockRejectedValueOnce(new Error("db"))
    const data = { program: { _id: programId }, placeName: "X" } as unknown as ProgramWithPlace
    await expect(notifyProgramNotice(data, "Hola")).resolves.toBeUndefined()
    expect(mockGoogleNotice).toHaveBeenCalled()
  })
})

describe("refreshProgramCards", () => {
  beforeEach(() => jest.clearAllMocks())

  it("refreshes every card of the place without a lock-screen notice", async () => {
    const data = { program: { _id: programId }, placeName: "Local", placePath: "/lugar/local", safety: null, locations: [] }
    mockCardFind
      .mockResolvedValueOnce([{ serialNumber: "a1" }, { serialNumber: "a2" }])
      .mockResolvedValueOnce([{ serialNumber: "g1" }])
    await refreshProgramCards(data as unknown as ProgramWithPlace)
    expect(mockUpdateMany).toHaveBeenCalledWith(
      { programId, wallet: { $ne: "google" } },
      { $set: { updatedAt: expect.any(Date) } },
      { timestamps: false }
    )
    expect(mockApplePushMany).toHaveBeenCalledWith(["a1", "a2"], expect.anything())
    expect(mockGoogleRefresh).toHaveBeenCalledWith(
      expect.objectContaining({ serialNumber: "g1", programId: programId.toString() }),
      expect.anything()
    )
    // La clase lleva el nombre y las ubicaciones de las sucursales.
    expect(mockGoogleClass).toHaveBeenCalledWith(
      expect.objectContaining({ programId: programId.toString(), placeName: "Local", locations: [] }),
      expect.anything()
    )
    expect(mockGooglePush).not.toHaveBeenCalled()
    expect(mockGoogleNotice).not.toHaveBeenCalled()
  })
})
