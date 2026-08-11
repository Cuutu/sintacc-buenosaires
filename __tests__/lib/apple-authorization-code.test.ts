/**
 * @jest-environment node
 */
import {
  extractAppleAuthorizationCode,
  extractAppleAuthorizationCodeString,
} from "@/lib/apple-authorization-code"

/** Fixtures matching Capgo 8.3.39 SocialLoginPlugin.swift serialization. */
const FIXTURE_LEGACY_MODE = {
  // useProperTokenExchange=false
  idToken: "hdr.payload.sig",
  accessToken: { token: "c1a2b3.authorization.code.from.apple" },
  // authorizationCode omitted (nil on native → key absent in JS)
  profile: {
    user: "001234.abcd",
    email: "user@privaterelay.appleid.com",
    givenName: "A",
    familyName: "B",
  },
}

const FIXTURE_PROPER_EXCHANGE = {
  idToken: "hdr.payload.sig",
  accessToken: null,
  authorizationCode: "c9z8y7.authorization.code.from.apple",
  profile: {
    user: "001234.abcd",
    email: null,
    givenName: null,
    familyName: null,
  },
}

describe("extractAppleAuthorizationCode Capgo 8.3.39", () => {
  it("legacy mode: canonical code is accessToken.token", () => {
    const r = extractAppleAuthorizationCode(FIXTURE_LEGACY_MODE)
    expect(r).toEqual({
      ok: true,
      code: "c1a2b3.authorization.code.from.apple",
      source: "accessToken.token",
    })
  })

  it("proper exchange: canonical is authorizationCode", () => {
    const r = extractAppleAuthorizationCode(FIXTURE_PROPER_EXCHANGE)
    expect(r).toEqual({
      ok: true,
      code: "c9z8y7.authorization.code.from.apple",
      source: "authorizationCode",
    })
  })

  it("prefers authorizationCode over accessToken when both present", () => {
    const r = extractAppleAuthorizationCode({
      authorizationCode: "from-field",
      accessToken: { token: "legacy" },
      idToken: "a.b.c",
    })
    expect(r.ok && r.source).toBe("authorizationCode")
  })

  it("rejects empty / wrong type / JWT-shaped values", () => {
    expect(extractAppleAuthorizationCode({ authorizationCode: "  " }).ok).toBe(
      false
    )
    expect(
      extractAppleAuthorizationCode({
        authorizationCode: "aaa.bbb.ccc",
      }).ok
    ).toBe(false)
    expect(
      extractAppleAuthorizationCode({
        accessToken: { token: "aaa.bbb.ccc" },
        idToken: "aaa.bbb.ccc",
      }).ok
    ).toBe(false)
    expect(extractAppleAuthorizationCode(null).ok).toBe(false)
    expect(extractAppleAuthorizationCodeString({})).toBeUndefined()
  })

  it("cancel / missing tokens → missing", () => {
    const r = extractAppleAuthorizationCode({
      idToken: "a.b.c",
      accessToken: null,
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe("missing")
  })
})
