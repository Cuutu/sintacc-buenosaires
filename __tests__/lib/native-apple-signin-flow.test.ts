/**
 * @jest-environment jsdom
 */
import { webcrypto } from "crypto"
import { readFileSync } from "fs"
import path from "path"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

Object.defineProperty(globalThis, "crypto", {
  value: webcrypto,
  configurable: true,
})

const signIn = jest.fn()
const reportNativeOAuth = jest.fn()
const isNativeApp = jest.fn(() => true)
const isNativeIosApp = jest.fn(() => true)

jest.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => signIn(...args),
}))

jest.mock("@/lib/native-app", () => ({
  isNativeApp: () => isNativeApp(),
  isNativeIosApp: () => isNativeIosApp(),
}))

jest.mock("@/lib/native-oauth-report", () => ({
  reportNativeOAuth: (...args: unknown[]) => reportNativeOAuth(...args),
}))

jest.mock("@capgo/capacitor-social-login", () => ({
  SocialLogin: {
    initialize: jest.fn().mockResolvedValue(undefined),
    login: jest.fn(),
    logout: jest.fn().mockResolvedValue(undefined),
  },
}))

import {
  __resetNativeSocialLoginForTests,
  isAppleSignInAvailable,
  signInWithApple,
  signInWithGoogle,
  NativeAppleSignInError,
} from "@/lib/native-sign-in"
import { SocialLogin } from "@capgo/capacitor-social-login"

const social = SocialLogin as unknown as {
  initialize: jest.Mock
  login: jest.Mock
}

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }
}

describe("Apple sign-in client flow", () => {
  beforeEach(() => {
    __resetNativeSocialLoginForTests()
    signIn.mockReset()
    reportNativeOAuth.mockReset()
    social.initialize.mockClear()
    social.login.mockReset()
    isNativeApp.mockReturnValue(true)
    isNativeIosApp.mockReturnValue(true)
    global.fetch = jest.fn()
  })

  it("iOS nativo ofrece Apple aunque el plugin no figure en el registry", () => {
    ;(window as unknown as { Capacitor?: unknown }).Capacitor = undefined
    expect(isAppleSignInAvailable()).toBe(true)
  })

  it("web no ofrece Apple", () => {
    isNativeApp.mockReturnValue(false)
    isNativeIosApp.mockReturnValue(false)
    expect(isAppleSignInAvailable()).toBe(false)
  })

  it("inicia el flujo Apple: challenge → Capgo → grant → NextAuth", async () => {
    ;(global.fetch as jest.Mock).mockImplementation(async (url: string) => {
      if (String(url).includes("/api/auth/native/apple/challenge")) {
        return jsonResponse(200, {
          challengeId: "a".repeat(32),
          nonce: "abc",
        })
      }
      if (String(url).includes("/api/auth/native/apple")) {
        return jsonResponse(200, { grant: "g".repeat(64) })
      }
      return jsonResponse(404, {})
    })
    social.login.mockResolvedValue({
      provider: "apple",
      result: {
        idToken: "header.payload.sig",
        profile: { givenName: "Ana", familyName: "Pérez" },
      },
    })
    signIn.mockResolvedValue({ ok: true })

    await signInWithApple("/perfil")

    expect(social.login).toHaveBeenCalledWith({
      provider: "apple",
      options: {
        scopes: ["email", "name"],
        nonce: expect.any(String),
      },
    })
    const post = (global.fetch as jest.Mock).mock.calls.find((call) =>
      String(call[0]).includes("/api/auth/native/apple") &&
      call[1]?.method === "POST"
    )
    expect(post).toBeTruthy()
    const body = JSON.parse(post[1].body as string)
    expect(body.challengeId).toBe("a".repeat(32))
    expect(body.idToken).toBe("header.payload.sig")
    expect(body.givenName).toBe("Ana")
    expect(signIn).toHaveBeenCalledWith("native-apple", {
      grant: "g".repeat(64),
      callbackUrl: "/perfil",
      redirect: true,
    })
  })

  it("respuesta posterior sin email todavía intercambia identityToken", async () => {
    ;(global.fetch as jest.Mock).mockImplementation(async (url: string) => {
      if (String(url).includes("/challenge")) {
        return jsonResponse(200, {
          challengeId: "b".repeat(32),
          nonce: "xyz",
        })
      }
      return jsonResponse(200, { grant: "h".repeat(64) })
    })
    social.login.mockResolvedValue({
      provider: "apple",
      result: {
        idToken: "token-without-email",
        profile: {},
      },
    })
    signIn.mockResolvedValue({ ok: true })

    await signInWithApple("/favoritos")

    const post = (global.fetch as jest.Mock).mock.calls.find(
      (call) => call[1]?.method === "POST"
    )
    const body = JSON.parse(post[1].body as string)
    expect(body.idToken).toBe("token-without-email")
    expect(body.givenName ?? null).toBeNull()
    expect(signIn).toHaveBeenCalledWith(
      "native-apple",
      expect.objectContaining({ callbackUrl: "/favoritos" })
    )
  })

  it("cancelación del sheet nativo → NativeAppleSignInError cancelled", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue(
      jsonResponse(200, { challengeId: "c".repeat(32), nonce: "n" })
    )
    social.login.mockRejectedValue(new Error("The user canceled the authorization attempt 1001"))

    await expect(signInWithApple("/perfil")).rejects.toMatchObject({
      name: "NativeAppleSignInError",
      code: "cancelled",
    })
    expect(signIn).not.toHaveBeenCalled()
  })

  it("error del plugin Capgo no deja la sesión a medias", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue(
      jsonResponse(200, { challengeId: "d".repeat(32), nonce: "n" })
    )
    social.login.mockRejectedValue(new Error("SocialLogin plugin failed"))

    await expect(signInWithApple("/perfil")).rejects.toBeInstanceOf(
      NativeAppleSignInError
    )
    expect(signIn).not.toHaveBeenCalled()
  })

  it("Google web no se rompe (NextAuth google)", async () => {
    isNativeApp.mockReturnValue(false)
    isNativeIosApp.mockReturnValue(false)
    signIn.mockResolvedValue({ ok: true })
    await signInWithGoogle("/perfil")
    expect(signIn).toHaveBeenCalledWith("google", { callbackUrl: "/perfil" })
    expect(social.login).not.toHaveBeenCalled()
  })
})

describe("Capgo Apple contract", () => {
  it("bundle id y scopes siguen en native-sign-in", () => {
    const src = readFileSync(
      path.join(process.cwd(), "lib", "native-sign-in.ts"),
      "utf8"
    )
    expect(src).toMatch(/clientId:\s*"com\.celimap\.app"/)
    expect(src).toMatch(/scopes:\s*\[\s*"email"\s*,\s*"name"\s*\]/)
    expect(src).not.toMatch(/apple:\s*\{[\s\S]*?redirectUrl\s*:/)
  })
})
