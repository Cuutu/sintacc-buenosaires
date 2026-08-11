/**
 * @jest-environment node
 */
import { exportPKCS8, generateKeyPair } from "jose"
import {
  APPLE_REVOKE_URL,
  APPLE_TOKEN_URL,
  createAppleClientSecret,
  exchangeAndRevokeAppleAuthorization,
} from "@/lib/apple-token-revoke"

describe("apple-revoke flow (mocked HTTP)", () => {
  const logs: string[] = []
  const originalLog = console.log
  const originalError = console.error

  beforeAll(async () => {
    const { privateKey } = await generateKeyPair("ES256", { extractable: true })
    const pem = await exportPKCS8(privateKey)
    process.env.APPLE_TEAM_ID = "TEAM123456"
    process.env.APPLE_KEY_ID = "KEYID12345"
    process.env.APPLE_PRIVATE_KEY = pem
    process.env.APPLE_CLIENT_ID = "com.celimap.app"
  })

  beforeEach(() => {
    logs.length = 0
    console.log = (...args: unknown[]) => {
      logs.push(args.map(String).join(" "))
    }
    console.error = (...args: unknown[]) => {
      logs.push(args.map(String).join(" "))
    }
  })

  afterEach(() => {
    console.log = originalLog
    console.error = originalError
  })

  it("crea client secret ES256 corto", async () => {
    const secret = await createAppleClientSecret({ nowSec: 1_700_000_000 })
    expect(secret.split(".")).toHaveLength(3)
  })

  it("exchange válido + revoke 200", async () => {
    const fetchFn = jest.fn(async (url: string) => {
      if (url === APPLE_TOKEN_URL) {
        return {
          status: 200,
          text: async () =>
            JSON.stringify({
              access_token: "access-SECRET",
              refresh_token: "refresh-SECRET",
            }),
        }
      }
      if (url === APPLE_REVOKE_URL) {
        return { status: 200, text: async () => "" }
      }
      throw new Error("unexpected url")
    }) as unknown as typeof fetch

    const r = await exchangeAndRevokeAppleAuthorization("auth-code", {
      fetchFn,
      nowSec: 1_700_000_000,
    })
    expect(r).toEqual({ ok: true, code: "revoked" })
    const blob = logs.join("\n")
    expect(blob).not.toContain("access-SECRET")
    expect(blob).not.toContain("refresh-SECRET")
    expect(blob).not.toContain("auth-code")
  })

  it("exchange rechazado", async () => {
    const fetchFn = jest.fn(async () => ({
      status: 400,
      text: async () => JSON.stringify({ error: "invalid_grant" }),
    })) as unknown as typeof fetch
    const r = await exchangeAndRevokeAppleAuthorization("bad", {
      fetchFn,
      nowSec: 1_700_000_000,
    })
    expect(r.code).toBe("exchange_failed")
  })

  it("revoke ya realizado (invalid_grant)", async () => {
    const fetchFn = jest.fn(async (url: string) => {
      if (url === APPLE_TOKEN_URL) {
        return {
          status: 200,
          text: async () => JSON.stringify({ access_token: "a" }),
        }
      }
      return {
        status: 400,
        text: async () => JSON.stringify({ error: "invalid_grant" }),
      }
    }) as unknown as typeof fetch
    const r = await exchangeAndRevokeAppleAuthorization("code", {
      fetchFn,
      nowSec: 1_700_000_000,
    })
    expect(r.ok).toBe(true)
    expect(r.code).toBe("already_revoked")
  })

  it("timeout", async () => {
    const fetchFn = jest.fn(async () => {
      const err = new Error("aborted")
      err.name = "AbortError"
      throw err
    }) as unknown as typeof fetch
    const r = await exchangeAndRevokeAppleAuthorization("code", {
      fetchFn,
      nowSec: 1_700_000_000,
    })
    expect(r.code).toBe("timeout")
  })
})
