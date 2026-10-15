/**
 * @jest-environment node
 */
import { NextRequest } from "next/server"

jest.mock("@/lib/mongodb", () => ({ __esModule: true, default: jest.fn() }))
const mockFindOne = jest.fn()
jest.mock("@/models/LoyaltyCard", () => ({
  LoyaltyCard: { findOne: (...a: unknown[]) => mockFindOne(...a) },
}))
const mockDeviceUpdate = jest.fn()
jest.mock("@/models/LoyaltyDevice", () => ({
  LoyaltyDevice: { findOneAndUpdate: (...a: unknown[]) => mockDeviceUpdate(...a), deleteOne: jest.fn() },
}))
jest.mock("@/lib/wallet/apple-pass", () => ({
  getApplePassConfig: () => ({ passTypeIdentifier: "pass.com.celimap.loyalty" }),
}))

import { POST } from "@/app/api/wallet/apple/v1/devices/[deviceId]/registrations/[passTypeId]/[serial]/route"

const SERIAL = "b".repeat(32)
const TOKEN = "t".repeat(48)
const params = {
  params: { deviceId: "device123", passTypeId: "pass.com.celimap.loyalty", serial: SERIAL },
}
const req = (auth?: string) =>
  new NextRequest("http://localhost:3000/api/wallet/apple/v1/devices/x", {
    method: "POST",
    headers: auth ? { authorization: auth } : {},
    body: JSON.stringify({ pushToken: "abcdef0123456789abcdef" }),
  })

describe("Apple Wallet device registration", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFindOne.mockResolvedValue({ serialNumber: SERIAL, authToken: TOKEN })
  })

  it("rejects requests without the card token", async () => {
    expect((await POST(req(), params)).status).toBe(401)
    expect((await POST(req("ApplePass wrong"), params)).status).toBe(401)
    expect(mockDeviceUpdate).not.toHaveBeenCalled()
  })

  it("rejects another pass type", async () => {
    const other = { params: { ...params.params, passTypeId: "pass.other" } }
    expect((await POST(req(`ApplePass ${TOKEN}`), other)).status).toBe(401)
  })

  it("registers the device with the right token", async () => {
    mockDeviceUpdate.mockResolvedValue(null)
    expect((await POST(req(`ApplePass ${TOKEN}`), params)).status).toBe(201)
    mockDeviceUpdate.mockResolvedValue({})
    expect((await POST(req(`ApplePass ${TOKEN}`), params)).status).toBe(200)
  })
})
