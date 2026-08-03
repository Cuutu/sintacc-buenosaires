/**
 * @jest-environment node
 */
import { NextRequest } from "next/server"

jest.mock("@/lib/rate-limit")
jest.mock("@/lib/native-google-auth", () => {
  const actual = jest.requireActual("@/lib/native-google-auth")
  return {
    ...actual,
    isNativeGoogleAuthEnabled: jest.fn(),
    resolveGoogleNativeIdentity: jest.fn(),
    upsertUserFromGoogleIdentity: jest.fn(),
    createNativeGoogleGrant: jest.fn(),
  }
})

import { POST } from "@/app/api/auth/native/google/route"
import {
  createNativeGoogleGrant,
  getGoogleAudienceAllowlist,
  isAllowedGoogleAudience,
  isNativeGoogleAuthEnabled,
  resolveGoogleNativeIdentity,
  upsertUserFromGoogleIdentity,
} from "@/lib/native-google-auth"

describe("getGoogleAudienceAllowlist / isAllowedGoogleAudience", () => {
  const prevWeb = process.env.GOOGLE_CLIENT_ID
  const prevIos = process.env.GOOGLE_IOS_CLIENT_ID

  afterEach(() => {
    process.env.GOOGLE_CLIENT_ID = prevWeb
    process.env.GOOGLE_IOS_CLIENT_ID = prevIos
  })

  it("includes web + iOS client ids", () => {
    process.env.GOOGLE_CLIENT_ID = "web.apps.googleusercontent.com"
    process.env.GOOGLE_IOS_CLIENT_ID = "ios.apps.googleusercontent.com"
    expect(getGoogleAudienceAllowlist()).toEqual([
      "web.apps.googleusercontent.com",
      "ios.apps.googleusercontent.com",
    ])
    expect(isAllowedGoogleAudience("ios.apps.googleusercontent.com")).toBe(true)
    expect(isAllowedGoogleAudience("other")).toBe(false)
  })
})

describe("POST /api/auth/native/google", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    require("@/lib/rate-limit").checkRateLimitByIp = jest.fn().mockResolvedValue({
      allowed: true,
      remaining: 19,
    })
    ;(isNativeGoogleAuthEnabled as jest.Mock).mockReturnValue(true)
  })

  it("returns 404 when feature flag off", async () => {
    ;(isNativeGoogleAuthEnabled as jest.Mock).mockReturnValue(false)
    const req = new NextRequest("http://localhost:3000/api/auth/native/google", {
      method: "POST",
      body: JSON.stringify({ idToken: "x" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(404)
  })

  it("returns 400 when body missing tokens", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/native/google", {
      method: "POST",
      body: JSON.stringify({}),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("returns 429 when rate limited", async () => {
    require("@/lib/rate-limit").checkRateLimitByIp = jest.fn().mockResolvedValue({
      allowed: false,
      remaining: 0,
    })
    const req = new NextRequest("http://localhost:3000/api/auth/native/google", {
      method: "POST",
      body: JSON.stringify({ idToken: "tok" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(429)
  })

  it("returns opaque grant on success", async () => {
    ;(resolveGoogleNativeIdentity as jest.Mock).mockResolvedValue({
      sub: "sub-1",
      email: "user@example.com",
      emailVerified: true,
      name: "User",
    })
    ;(upsertUserFromGoogleIdentity as jest.Mock).mockResolvedValue({
      _id: { toString: () => "user-id-1" },
    })
    ;(createNativeGoogleGrant as jest.Mock).mockResolvedValue("grant-abc")

    const req = new NextRequest("http://localhost:3000/api/auth/native/google", {
      method: "POST",
      body: JSON.stringify({ serverAuthCode: "code-1" }),
    })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toEqual({ grant: "grant-abc" })
    expect(resolveGoogleNativeIdentity).toHaveBeenCalledWith({
      idToken: undefined,
      serverAuthCode: "code-1",
    })
  })

  it("returns 401 when Google validation fails", async () => {
    ;(resolveGoogleNativeIdentity as jest.Mock).mockRejectedValue(
      new Error("Google token audience not allowed")
    )
    const req = new NextRequest("http://localhost:3000/api/auth/native/google", {
      method: "POST",
      body: JSON.stringify({ idToken: "bad" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe("Google auth failed")
  })
})
