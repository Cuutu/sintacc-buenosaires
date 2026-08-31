import {
  isStoreBannerEligible,
  isStoreBannerDebugQuery,
  resolveBottomPrompt,
  readBottomPromptSnapshot,
  STORE_BANNER_SNOOZE_MS,
} from "@/lib/bottom-prompt"

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko)"
const safari = `${IPHONE} Version/17.4 Mobile/15E148 Safari/604.1`
const chrome = `${IPHONE} CriOS/123.0.6312.52 Mobile/15E148 Safari/604.1`
const instagram = `${IPHONE} Mobile/15E148 Instagram 302.0.0.0.0`

describe("resolveBottomPrompt", () => {
  it("iOS Chrome → store (supprime InstallPrompt)", () => {
    expect(
      readBottomPromptSnapshot({
        userAgent: chrome,
        nativeApp: false,
        standalone: false,
      }).prompt
    ).toBe("store")
  })

  it("iOS Instagram → store", () => {
    expect(
      readBottomPromptSnapshot({
        userAgent: instagram,
        nativeApp: false,
        standalone: false,
      }).prompt
    ).toBe("store")
  })

  it("Safari nativo iOS → install (Smart App Banner de Apple)", () => {
    expect(
      readBottomPromptSnapshot({
        userAgent: safari,
        nativeApp: false,
        standalone: false,
      }).prompt
    ).toBe("install")
  })

  it("Capacitor y PWA standalone → install (banner store oculto)", () => {
    expect(
      isStoreBannerEligible({
        platform: "ios",
        browser: "chrome",
        nativeApp: true,
        standalone: false,
        dismissedUntil: 0,
      })
    ).toBe(false)
    expect(
      isStoreBannerEligible({
        platform: "ios",
        browser: "instagram",
        nativeApp: false,
        standalone: true,
        dismissedUntil: 0,
      })
    ).toBe(false)
  })

  it("desktop y Android (Play apagado) → install", () => {
    expect(
      resolveBottomPrompt({
        platform: "desktop",
        browser: "safari",
        nativeApp: false,
        standalone: false,
        dismissedUntil: 0,
      })
    ).toBe("install")
    expect(
      resolveBottomPrompt({
        platform: "android",
        browser: "chrome",
        nativeApp: false,
        standalone: false,
        dismissedUntil: 0,
      })
    ).toBe("install")
  })

  it("dismiss vigente 7 días → install", () => {
    const now = 1_000_000
    expect(
      resolveBottomPrompt({
        platform: "ios",
        browser: "chrome",
        nativeApp: false,
        standalone: false,
        dismissedUntil: now + STORE_BANNER_SNOOZE_MS,
        now,
      })
    ).toBe("install")
  })

  it("debugBanner=1 fuerza store e ignora UA/dismiss", () => {
    expect(isStoreBannerDebugQuery("?debugBanner=1")).toBe(true)
    expect(isStoreBannerDebugQuery("foo=1")).toBe(false)
    expect(
      resolveBottomPrompt({
        platform: "desktop",
        browser: "safari",
        nativeApp: false,
        standalone: false,
        dismissedUntil: Date.now() + STORE_BANNER_SNOOZE_MS,
        debugBanner: true,
      })
    ).toBe("store")
    expect(
      readBottomPromptSnapshot({
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        nativeApp: false,
        standalone: false,
        debugBanner: true,
      }).store
    ).toBe("ios")
  })

  it("Safari nativo y store banner no al mismo tiempo; store XOR install", () => {
    const storeCase = readBottomPromptSnapshot({
      userAgent: chrome,
      nativeApp: false,
      standalone: false,
    })
    const safariCase = readBottomPromptSnapshot({
      userAgent: safari,
      nativeApp: false,
      standalone: false,
    })
    expect(storeCase.prompt).toBe("store")
    expect(safariCase.prompt).toBe("install")
  })
})
