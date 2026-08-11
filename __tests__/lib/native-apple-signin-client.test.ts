/**
 * @jest-environment jsdom
 */
import { webcrypto } from "crypto"
import {
  isAppleSignInAvailable,
  buildNativeGoogleStartUrl,
} from "@/lib/native-sign-in"
import { appleRequestNonceFromRaw } from "@/lib/native-apple-auth-client"

Object.defineProperty(globalThis, "crypto", {
  value: webcrypto,
  configurable: true,
})

jest.mock("@/lib/native-app", () => ({
  isNativeApp: jest.fn(() => false),
  isNativeIosApp: jest.fn(() => false),
}))

describe("Apple client helpers", () => {
  it("client SHA-256 hex matches known digest", async () => {
    const client = await appleRequestNonceFromRaw("abc")
    expect(client).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    )
  })

  it("Apple disponible solo en iOS nativo con plugin", () => {
    const { isNativeApp, isNativeIosApp } = jest.requireMock("@/lib/native-app") as {
      isNativeApp: jest.Mock
      isNativeIosApp: jest.Mock
    }
    isNativeApp.mockReturnValue(false)
    isNativeIosApp.mockReturnValue(false)
    expect(isAppleSignInAvailable()).toBe(false)

    isNativeApp.mockReturnValue(true)
    isNativeIosApp.mockReturnValue(true)
    ;(window as unknown as { Capacitor?: unknown }).Capacitor = {
      isPluginAvailable: () => true,
      Plugins: { SocialLogin: {} },
    }
    expect(isAppleSignInAvailable()).toBe(true)
  })

  it("Google start URL intacto (sin regresión)", () => {
    const url = buildNativeGoogleStartUrl("/perfil", "https://www.celimap.com.ar")
    expect(url).toContain("/auth/native-start?")
    expect(url).toContain("from=native")
  })
})

describe("Apple login options contract", () => {
  it("native-sign-in pide scopes email/name y clientId bundle (sin redirectUrl vacío)", async () => {
    // Static source contract — avoids loading Capgo ESM in jsdom.
    const fs = await import("fs")
    const path = await import("path")
    const src = fs.readFileSync(
      path.join(process.cwd(), "lib", "native-sign-in.ts"),
      "utf8"
    )
    expect(src).toMatch(/provider:\s*"apple"/)
    expect(src).toMatch(/scopes:\s*\[\s*"email"\s*,\s*"name"\s*\]/)
    expect(src).toMatch(/clientId:\s*"com\.celimap\.app"/)
    expect(src).not.toMatch(/apple:\s*\{[\s\S]*?redirectUrl\s*:/)
  })
})
