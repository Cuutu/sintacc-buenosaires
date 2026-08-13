/**
 * Auth JWT/session regression tests (Google OAuth vs Mongo ids).
 * @jest-environment node
 */
jest.mock("@/lib/mongodb", () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}))
jest.mock("@/models/User")
jest.mock("@/lib/native-google-auth", () => ({
  consumeNativeGoogleGrant: jest.fn(),
}))
jest.mock("@/lib/native-apple-auth", () => ({
  consumeNativeAppleGrant: jest.fn(),
}))

import {
  authOptions,
  isMongoObjectIdString,
  normalizeAuthEmail,
} from "@/lib/auth"

const MONGO_ID = "507f1f77bcf86cd799439011"
const GOOGLE_SUB = "108234567890123456789"

describe("auth id helpers", () => {
  it("accepts only strict 24-hex Mongo ids", () => {
    expect(isMongoObjectIdString(MONGO_ID)).toBe(true)
    expect(isMongoObjectIdString(GOOGLE_SUB)).toBe(false)
    expect(isMongoObjectIdString("123")).toBe(false)
  })

  it("normalizes emails", () => {
    expect(normalizeAuthEmail("  Foo@Bar.COM ")).toBe("foo@bar.com")
    expect(normalizeAuthEmail("nope")).toBeNull()
  })
})

describe("auth callbacks", () => {
  const mockUserFindOne = jest.fn()
  const mockUserFindById = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    require("@/models/User").User.findOne = mockUserFindOne
    require("@/models/User").User.findById = mockUserFindById
  })

  describe("jwt callback", () => {
    it("1. Google OAuth sub resolves Mongo user by email", async () => {
      mockUserFindOne.mockResolvedValue({
        _id: { toString: () => MONGO_ID },
        role: "user",
        email: "user@test.com",
      })
      const result = await (authOptions.callbacks as any).jwt({
        token: {},
        user: {
          id: GOOGLE_SUB,
          email: "User@Test.com",
          name: "User",
        },
      })
      expect(result.id).toBe(MONGO_ID)
      expect(result.email).toBe("user@test.com")
      expect(mockUserFindOne).toHaveBeenCalled()
    })

    it("2. never calls findById with Google sub", async () => {
      mockUserFindOne.mockResolvedValue({
        _id: { toString: () => MONGO_ID },
        role: "user",
        email: "user@test.com",
      })
      await (authOptions.callbacks as any).jwt({
        token: {},
        user: { id: GOOGLE_SUB, email: "user@test.com" },
      })
      expect(mockUserFindById).not.toHaveBeenCalled()
      expect(mockUserFindById).not.toHaveBeenCalledWith(GOOGLE_SUB)
    })

    it("3. native login keeps Mongo _id via findById", async () => {
      mockUserFindById.mockResolvedValue({
        _id: { toString: () => MONGO_ID },
        role: "admin",
        email: "native@test.com",
      })
      const result = await (authOptions.callbacks as any).jwt({
        token: {},
        user: { id: MONGO_ID, email: "native@test.com", name: "Native" },
      })
      expect(mockUserFindById).toHaveBeenCalledWith(MONGO_ID)
      expect(result.id).toBe(MONGO_ID)
      expect(result.role).toBe("admin")
    })

    it("3b. native-apple grant keeps Mongo _id (no JWT regression)", async () => {
      mockUserFindById.mockResolvedValue({
        _id: { toString: () => MONGO_ID },
        role: "user",
        email: "apple@privaterelay.appleid.com",
      })
      const result = await (authOptions.callbacks as any).jwt({
        token: {},
        user: {
          id: MONGO_ID,
          email: "apple@privaterelay.appleid.com",
          name: "Usuario Apple",
        },
      })
      expect(mockUserFindById).toHaveBeenCalledWith(MONGO_ID)
      expect(result.id).toBe(MONGO_ID)
      expect(result.email).toBe("apple@privaterelay.appleid.com")
    })

    it("4. refresh without providerUser keeps Mongo token.id (no DB)", async () => {
      const token = { id: MONGO_ID, role: "user" as const, email: "a@b.com" }
      const result = await (authOptions.callbacks as any).jwt({
        token,
        user: undefined,
      })
      expect(result.id).toBe(MONGO_ID)
      expect(mockUserFindById).not.toHaveBeenCalled()
      expect(mockUserFindOne).not.toHaveBeenCalled()
    })

    it("5. broken JWT without id heals via email", async () => {
      mockUserFindOne.mockResolvedValue({
        _id: { toString: () => MONGO_ID },
        role: "user",
        email: "heal@test.com",
      })
      const result = await (authOptions.callbacks as any).jwt({
        token: { email: "heal@test.com" },
        user: undefined,
      })
      expect(result.id).toBe(MONGO_ID)
      expect(mockUserFindOne).toHaveBeenCalled()
    })

    it("5b. Google-sub token.id from 63fd027 is stripped then healed by email", async () => {
      mockUserFindOne.mockResolvedValue({
        _id: { toString: () => MONGO_ID },
        role: "user",
        email: "legacy@test.com",
      })
      const result = await (authOptions.callbacks as any).jwt({
        token: { id: GOOGLE_SUB, email: "legacy@test.com" },
        user: undefined,
      })
      expect(result.id).toBe(MONGO_ID)
      expect(result.id).not.toBe(GOOGLE_SUB)
      expect(mockUserFindById).not.toHaveBeenCalledWith(GOOGLE_SUB)
    })

    it("6. missing user on Google sign-in does not store provider sub", async () => {
      mockUserFindOne.mockResolvedValue(null)
      const result = await (authOptions.callbacks as any).jwt({
        token: {},
        user: { id: GOOGLE_SUB, email: "ghost@test.com" },
      })
      expect(result.id).toBeUndefined()
      expect(mockUserFindById).not.toHaveBeenCalled()
    })

    it("7. transient DB failure keeps valid Mongo token.id", async () => {
      const connectDB = require("@/lib/mongodb").default as jest.Mock
      connectDB.mockRejectedValueOnce(new Error("mongo timeout"))
      const token = { id: MONGO_ID, role: "user" as const, email: "a@b.com" }
      // Force path that would hit DB: strip id so refresh tries email, then restore scenario
      // Spec: valid id refresh returns early — simulate heal path with thrown connect:
      const broken = { email: "a@b.com" } as { id?: string; email: string }
      const result = await (authOptions.callbacks as any).jwt({
        token: broken,
        user: undefined,
      })
      // no id to keep; ensure no throw and no fake google id
      expect(result.id).toBeUndefined()

      connectDB.mockRejectedValueOnce(new Error("mongo timeout"))
      const withId = await (authOptions.callbacks as any).jwt({
        token: { id: MONGO_ID, email: "a@b.com" },
        user: undefined,
      })
      expect(withId.id).toBe(MONGO_ID)
    })

    it("8. never assigns Google sub as token.id even if findOne empty", async () => {
      mockUserFindOne.mockResolvedValue(null)
      const result = await (authOptions.callbacks as any).jwt({
        token: { id: GOOGLE_SUB },
        user: { id: GOOGLE_SUB, email: "x@y.com" },
      })
      expect(result.id).toBeUndefined()
    })
  })

  describe("session callback", () => {
    it("8. session.user.id is always a Mongo ObjectId when present", async () => {
      const session = {
        user: { email: "test@test.com", name: "T" },
        expires: new Date(Date.now() + 86400000).toISOString(),
      }
      const result = await (authOptions.callbacks as any).session({
        session,
        token: { id: MONGO_ID, role: "admin", email: "test@test.com" },
      })
      expect(result.user.id).toBe(MONGO_ID)
      expect(isMongoObjectIdString(result.user.id)).toBe(true)
      expect(result.user.role).toBe("admin")
    })

    it("6b. invalid token does not fabricate expires:1970 empty authenticated profile", async () => {
      const expires = new Date(Date.now() + 86400000).toISOString()
      const session = {
        user: { email: "test@test.com", name: "T" },
        expires,
      }
      const result = await (authOptions.callbacks as any).session({
        session,
        token: { id: GOOGLE_SUB, email: "test@test.com" },
      })
      expect(result.user).toBeUndefined()
      expect(result.expires).toBe(expires)
      expect(result.expires).not.toBe(new Date(0).toISOString())
    })
  })
})
