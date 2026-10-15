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
jest.mock("@/models/LoyaltyCard", () => ({ LoyaltyCard: { findOne: (...a: unknown[]) => mockFindOne(...a) } }))
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
const req = (cookie?: string) =>
  new NextRequest(`http://localhost:3000/api/wallet/tarjeta/${programId}/google`, {
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
    })
    mockCreateCard.mockResolvedValue({ programId, serialNumber: SERIAL, authToken: "t", stamps: 0 })
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
    expect(mockCreateCard).toHaveBeenCalledWith(programId, "google")
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

  it("does not hand out cards for paused programs", async () => {
    mockGetProgram.mockResolvedValue({
      program: { _id: programId, active: false },
      placeName: "Polvorín",
      placePath: "/lugar/polvorin",
    })
    expect((await GET(req(), params)).status).toBe(404)
  })
})
