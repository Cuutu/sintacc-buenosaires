/**
 * @jest-environment node
 */
import {
  buildNativeGoogleStartUrl,
  resolveNativeAuthOrigin,
} from "@/lib/native-sign-in"
import { sanitizeReturnTo } from "@/lib/auth-return-to"
import { parseNativeAuthHandoffUrl } from "@/lib/native-auth-deeplink"

describe("native Google OAuth helpers", () => {
  it("buildNativeGoogleStartUrl still builds legacy Browser URL (rollback only)", () => {
    const url = buildNativeGoogleStartUrl("/perfil", "https://www.celimap.com.ar")
    expect(url).toContain("https://www.celimap.com.ar/auth/native-start?")
    expect(url).toContain("from=native")
    expect(url).toContain("returnTo=%2Fperfil")
    expect(url).not.toContain("/api/auth/signin/google")
    expect(url).not.toMatch(/\/login(\?|$)/)
    expect(url).not.toMatch(/[?&]token=/)
    expect(url).not.toMatch(/Bearer/)
  })

  it("origin allowlist: host raro → prod", () => {
    expect(resolveNativeAuthOrigin("https://evil.example")).toBe(
      "https://www.celimap.com.ar"
    )
    expect(resolveNativeAuthOrigin("https://www.celimap.com.ar")).toBe(
      "https://www.celimap.com.ar"
    )
  })

  it("exposes public Google client ids for native SDK", async () => {
    const { getNativeGoogleIosClientId, getNativeGoogleWebClientId } = await import(
      "@/lib/native-sign-in"
    )
    expect(getNativeGoogleWebClientId()).toContain("apps.googleusercontent.com")
    expect(getNativeGoogleIosClientId()).toContain("apps.googleusercontent.com")
    expect(getNativeGoogleIosClientId()).toContain("ffml8h7qtolnmkgddd9dl0iv9a3i0fmo")
  })
})

describe("sanitizeReturnTo", () => {
  it("acepta rutas internas", () => {
    expect(sanitizeReturnTo("/perfil")).toBe("/perfil")
    expect(sanitizeReturnTo("/favoritos")).toBe("/favoritos")
    expect(sanitizeReturnTo("/mapa?x=1")).toBe("/mapa?x=1")
  })

  it("rechaza open redirects y esquemas peligrosos", () => {
    expect(sanitizeReturnTo("https://evil.com")).toBe("/perfil")
    expect(sanitizeReturnTo("//evil.com")).toBe("/perfil")
    expect(sanitizeReturnTo("javascript:alert(1)")).toBe("/perfil")
    expect(sanitizeReturnTo("data:text/html,x")).toBe("/perfil")
    expect(sanitizeReturnTo("/\\evil")).toBe("/perfil")
    expect(sanitizeReturnTo("%2f%2fevil.com")).toBe("/perfil")
  })
})

describe("native auth deep link parse", () => {
  it("acepta celimap://auth/handoff con code hex", () => {
    const code = "a".repeat(64)
    const parsed = parseNativeAuthHandoffUrl(
      `celimap://auth/handoff?code=${code}&next=%2Fperfil`
    )
    expect(parsed).toEqual({ code, next: "/perfil" })
  })

  it("acepta auth/callback (futuro) y rechaza otros paths", () => {
    const code = "b".repeat(64)
    expect(
      parseNativeAuthHandoffUrl(`celimap://auth/callback?code=${code}&next=/favoritos`)
    ).toEqual({ code, next: "/favoritos" })
    expect(parseNativeAuthHandoffUrl(`celimap://auth/other?code=${code}`)).toBeNull()
    expect(
      parseNativeAuthHandoffUrl(`https://www.celimap.com.ar/?code=${code}`)
    ).toBeNull()
  })

  it("rechaza code no hex / corto", () => {
    expect(
      parseNativeAuthHandoffUrl("celimap://auth/handoff?code=short&next=/perfil")
    ).toBeNull()
    expect(
      parseNativeAuthHandoffUrl("celimap://auth/handoff?code=not-hex!!!!&next=/perfil")
    ).toBeNull()
  })
})
