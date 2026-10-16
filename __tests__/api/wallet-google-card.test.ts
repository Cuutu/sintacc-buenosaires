/**
 * @jest-environment node
 */
import { NextRequest } from "next/server"
import mongoose from "mongoose"

jest.mock("@/lib/mongodb", () => ({ __esModule: true, default: jest.fn() }))
jest.mock("@/lib/logger", () => ({ logApiError: jest.fn() }))
jest.mock("@/lib/rate-limit", () => ({
  checkRateLimitByIp: jest.fn().mockResolvedValue({ allowed: true, retryAfterSeconds: 0 }),
}))

const programId = new mongoose.Types.ObjectId()
const mockGetProgram = jest.fn()
const mockCreateCard = jest.fn()
jest.mock("@/lib/wallet/loyalty", () => ({
  ...jest.requireActual("@/lib/wallet/loyalty"),
  getProgramWithPlace: (...a: unknown[]) => mockGetProgram(...a),
  createCard: (...a: unknown[]) => mockCreateCard(...a),
}))
const mockFindOne = jest.fn()
const mockExists = jest.fn()
jest.mock("@/models/LoyaltyCard", () => ({
  LoyaltyCard: {
    findOne: (...a: unknown[]) => mockFindOne(...a),
    exists: (...a: unknown[]) => mockExists(...a),
  },
}))
jest.mock("@/models/LoyaltyProgram", () => ({ LoyaltyProgram: {} }))
jest.mock("@/models/LoyaltyStamp", () => ({ LoyaltyStamp: {} }))
jest.mock("@/models/Place", () => ({ Place: {} }))

const mockConfig = jest.fn()
const mockSaveLink = jest.fn()
jest.mock("@/lib/wallet/google-wallet", () => ({
  getGoogleWalletConfig: () => mockConfig(),
  googleSaveLink: (...a: unknown[]) => mockSaveLink(...a),
}))

import { GET } from "@/app/api/wallet/tarjeta/[programaId]/google/route"

const SERIAL = "b".repeat(32)
const params = { params: { programaId: programId.toString() } }
const req = (cookie?: string, query = "") =>
  new NextRequest(`http://localhost:3000/api/wallet/tarjeta/${programId}/google${query}`, {
    headers: cookie ? { cookie } : {},
  })

describe("GET /api/wallet/tarjeta/[programaId]/google", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockConfig.mockReturnValue({ issuerId: "1", serviceAccountEmail: "x", privateKey: "k" })
    mockGetProgram.mockResolvedValue({
      program: { _id: programId, active: true, stampsForReward: 10, reward: "Cookie" },
      placeName: "Polvorín",
      placePath: "/lugar/polvorin",
      locations: [],
      branches: [],
    })
    mockCreateCard.mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      programId,
      serialNumber: SERIAL,
      authToken: "t",
      stamps: 0,
    })
    mockSaveLink.mockResolvedValue("https://pay.google.com/gp/v/save/jwt")
  })

  it("is off without Google Wallet credentials", async () => {
    mockConfig.mockReturnValue(null)
    expect((await GET(req(), params)).status).toBe(503)
  })

  it("creates a Google card and sends the customer to save it", async () => {
    const res = await GET(req(), params)
    expect(res.status).toBe(303)
    expect(res.headers.get("location")).toBe("https://pay.google.com/gp/v/save/jwt")
    expect(mockCreateCard).toHaveBeenCalledWith(programId, "google", null, null)
    expect(mockSaveLink).toHaveBeenCalledWith(
      expect.objectContaining({ programId: programId.toString(), serialNumber: SERIAL, reward: "Cookie" }),
      expect.anything()
    )
    expect(res.headers.get("set-cookie")).toContain(`cm_tarjeta_google_${programId}=${SERIAL}`)
  })

  it("reuses the card from the cookie instead of making a new one", async () => {
    mockFindOne.mockResolvedValue({ programId, serialNumber: SERIAL, authToken: "t", stamps: 4 })
    const res = await GET(req(`cm_tarjeta_google_${programId}=${SERIAL}`), params)
    expect(res.status).toBe(303)
    expect(mockFindOne).toHaveBeenCalledWith(expect.objectContaining({ serialNumber: SERIAL, wallet: "google" }))
    expect(mockCreateCard).not.toHaveBeenCalled()
  })

  it("remembers the friend who invited them, only with the promo on", async () => {
    const amigo = new mongoose.Types.ObjectId().toString()
    mockExists.mockResolvedValue({ _id: amigo })
    await GET(req(undefined, `?amigo=${amigo}`), params)
    expect(mockExists).not.toHaveBeenCalled()
    expect(mockCreateCard).toHaveBeenLastCalledWith(programId, "google", null, null)

    mockGetProgram.mockResolvedValue({
      program: { _id: programId, active: true, stampsForReward: 10, reward: "Cookie", referralEnabled: true },
      placeName: "Polvorín",
      placePath: "/lugar/polvorin",
      locations: [],
      branches: [],
    })
    await GET(req(undefined, `?amigo=${amigo}`), params)
    expect(mockExists).toHaveBeenCalledWith({ _id: amigo, programId })
    const referredBy = mockCreateCard.mock.calls[1][2]
    expect(referredBy?.toString()).toBe(amigo)
  })

  it("does not hand out cards for paused programs", async () => {
    mockGetProgram.mockResolvedValue({
      program: { _id: programId, active: false },
      placeName: "Polvorín",
      placePath: "/lugar/polvorin",
      locations: [],
      branches: [],
    })
    expect((await GET(req(), params)).status).toBe(404)
  })

  it("does not create a second card when the same button is tapped twice", async () => {
    const KEY = "abcdefghijklmnop"
    mockFindOne.mockResolvedValueOnce(null)
    await GET(req(undefined, `?k=${KEY}`), params)
    expect(mockCreateCard).toHaveBeenCalledWith(programId, "google", null, KEY)

    mockFindOne.mockResolvedValueOnce({ _id: "c1", programId, serialNumber: SERIAL, authToken: "t", stamps: 0 })
    await GET(req(undefined, `?k=${KEY}`), params)
    expect(mockFindOne).toHaveBeenLastCalledWith({ programId, requestKey: KEY, wallet: "google" })
    expect(mockCreateCard).toHaveBeenCalledTimes(1)
  })

  it("recovers when both taps arrive at the same time", async () => {
    const KEY = "abcdefghijklmnop"
    mockFindOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ _id: "c1", programId, serialNumber: SERIAL, authToken: "t", stamps: 0 })
    mockCreateCard.mockRejectedValueOnce(Object.assign(new Error("E11000 duplicate key"), { code: 11000 }))
    const res = await GET(req(undefined, `?k=${KEY}`), params)
    expect(res.status).toBe(303)
    expect(res.headers.get("set-cookie")).toContain(SERIAL)
  })

  it("ignores malformed button codes", async () => {
    await GET(req(undefined, "?k=x"), params)
    expect(mockCreateCard).toHaveBeenLastCalledWith(programId, "google", null, null)
  })
})
