/**
 * @jest-environment node
 */
import { NextRequest } from "next/server"
import {
  AppleAuthError,
  consumeNativeAppleChallenge,
  createNativeAppleChallenge,
} from "@/lib/native-apple-auth"

jest.mock("@/lib/mongodb", () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}))

const challenges: Array<{
  challengeId: string
  nonceRaw: string
  expiresAt: Date
  used: boolean
}> = []

jest.mock("@/models/NativeAppleChallenge", () => ({
  NativeAppleChallenge: {
    create: jest.fn(async (data: (typeof challenges)[0]) => {
      challenges.push({ ...data, used: data.used ?? false })
      return data
    }),
    findOne: jest.fn((query: Record<string, unknown>) => ({
      lean: async () => {
        const found = challenges.find(
          (c) =>
            c.challengeId === query.challengeId &&
            (query.used === undefined || c.used === query.used)
        )
        return found ? { ...found } : null
      },
    })),
    findOneAndUpdate: jest.fn(
      async (
        filter: Record<string, unknown>,
        update: { $set: { used: boolean } }
      ) => {
        const doc = challenges.find(
          (c) =>
            c.challengeId === filter.challengeId &&
            c.used === false &&
            c.expiresAt > new Date()
        )
        if (!doc) return null
        doc.used = update.$set.used
        return { ...doc }
      }
    ),
  },
}))

jest.mock("@/lib/rate-limit", () => ({
  checkRateLimitByIp: jest.fn().mockResolvedValue({ allowed: true, remaining: 10 }),
}))

describe("Apple challenge lifecycle", () => {
  beforeEach(() => {
    challenges.length = 0
    jest.clearAllMocks()
  })

  it("crea challenge con nonce y id", async () => {
    const c = await createNativeAppleChallenge()
    expect(c.challengeId.length).toBeGreaterThanOrEqual(16)
    expect(c.nonce.length).toBeGreaterThanOrEqual(32)
    expect(c.expiresInSec).toBe(120)
  })

  it("consume una vez y rechaza replay", async () => {
    const c = await createNativeAppleChallenge()
    const once = await consumeNativeAppleChallenge(c.challengeId)
    expect(once.nonceRaw).toBe(c.nonce)
    await expect(consumeNativeAppleChallenge(c.challengeId)).rejects.toMatchObject({
      code: "challenge_reused",
    })
  })

  it("rechaza challenge vencido", async () => {
    const c = await createNativeAppleChallenge()
    challenges[0].expiresAt = new Date(Date.now() - 1000)
    await expect(consumeNativeAppleChallenge(c.challengeId)).rejects.toBeInstanceOf(
      AppleAuthError
    )
  })
})

describe("GET /api/auth/native/apple/challenge", () => {
  it("devuelve challenge JSON", async () => {
    const { GET } = await import("@/app/api/auth/native/apple/challenge/route")
    const req = new NextRequest(
      "http://localhost:3000/api/auth/native/apple/challenge"
    )
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.challengeId).toBeTruthy()
    expect(body.nonce).toBeTruthy()
  })
})
