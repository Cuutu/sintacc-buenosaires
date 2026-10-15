/**
 * @jest-environment node
 */
import mongoose from "mongoose"

const mockApplePush = jest.fn()
const mockGooglePush = jest.fn()
const mockGetProgram = jest.fn()
jest.mock("@/lib/wallet/apple-push", () => ({ notifyPassUpdated: (...a: unknown[]) => mockApplePush(...a) }))
jest.mock("@/lib/wallet/google-wallet", () => ({ pushGoogleCardUpdate: (...a: unknown[]) => mockGooglePush(...a) }))
jest.mock("@/lib/wallet/config", () => ({
  getApplePassConfig: () => ({ passTypeIdentifier: "p" }),
  getGoogleWalletConfig: () => ({ issuerId: "1" }),
}))
jest.mock("@/lib/wallet/loyalty", () => ({
  getProgramWithPlace: (...a: unknown[]) => mockGetProgram(...a),
  passInputFor: (card: { serialNumber: string }) => ({ serialNumber: card.serialNumber }),
}))

import { notifyCardChanged } from "@/lib/wallet/notify"
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
