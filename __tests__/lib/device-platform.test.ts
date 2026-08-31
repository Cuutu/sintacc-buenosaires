import {
  CELIMAP_APP_STORE_URL,
  CELIMAP_PLAY_STORE_URL,
  STORE_BANNER_ANDROID_ENABLED,
  getDevicePlatform,
  getStoreBannerBrowser,
  isNativeIosSafari,
  isStoreConfigured,
} from "@/lib/device-platform"

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko)"

const UA = {
  safari: `${IPHONE} Version/17.4 Mobile/15E148 Safari/604.1`,
  chrome: `${IPHONE} CriOS/123.0.6312.52 Mobile/15E148 Safari/604.1`,
  instagram: `${IPHONE} Mobile/15E148 Instagram 302.0.0.0.0`,
  facebook: `${IPHONE} Mobile/15E148 [FBAN/FBIOS;FBAV/400.0.0.0.0;]`,
  whatsapp: `${IPHONE} Version/17.4 Mobile/15E148 Safari/604.1 WhatsApp/24.1.0`,
  android: "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36",
  desktop: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
}

describe("getDevicePlatform", () => {
  it("detecta iPhone y iPad", () => {
    expect(getDevicePlatform({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)" })).toBe("ios")
    expect(getDevicePlatform({ userAgent: "Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)" })).toBe("ios")
  })

  it("detecta iPadOS que se reporta como Macintosh", () => {
    expect(
      getDevicePlatform({
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        maxTouchPoints: 5,
      })
    ).toBe("ios")
  })

  it("Macintosh sin touch es desktop", () => {
    expect(
      getDevicePlatform({
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        maxTouchPoints: 0,
      })
    ).toBe("desktop")
  })

  it("detecta Android", () => {
    expect(getDevicePlatform({ userAgent: "Mozilla/5.0 (Linux; Android 14)" })).toBe("android")
  })

  it("usa el App Store oficial", () => {
    expect(CELIMAP_APP_STORE_URL).toBe("https://apps.apple.com/ar/app/celimap/id6797278308")
  })
})

describe("getStoreBannerBrowser / Smart App Banner audience", () => {
  it("Safari nativo iOS", () => {
    expect(getStoreBannerBrowser(UA.safari)).toBe("safari")
    expect(isNativeIosSafari({ userAgent: UA.safari })).toBe(true)
  })

  it("Chrome iOS no es Safari nativo", () => {
    expect(getStoreBannerBrowser(UA.chrome)).toBe("chrome")
    expect(isNativeIosSafari({ userAgent: UA.chrome })).toBe(false)
  })

  it("Instagram in-app", () => {
    expect(getStoreBannerBrowser(UA.instagram)).toBe("instagram")
    expect(isNativeIosSafari({ userAgent: UA.instagram })).toBe(false)
  })

  it("Facebook in-app", () => {
    expect(getStoreBannerBrowser(UA.facebook)).toBe("facebook")
    expect(isNativeIosSafari({ userAgent: UA.facebook })).toBe(false)
  })

  it("WhatsApp gana aunque el UA traiga Version/Safari", () => {
    expect(getStoreBannerBrowser(UA.whatsapp)).toBe("whatsapp")
    expect(isNativeIosSafari({ userAgent: UA.whatsapp })).toBe(false)
  })

  it("Android y desktop no son Safari nativo iOS", () => {
    expect(isNativeIosSafari({ userAgent: UA.android })).toBe(false)
    expect(isNativeIosSafari({ userAgent: UA.desktop, maxTouchPoints: 0 })).toBe(false)
  })

  it("Android store queda apagado hasta Play Store", () => {
    expect(STORE_BANNER_ANDROID_ENABLED).toBe(false)
    expect(CELIMAP_PLAY_STORE_URL).toBe("")
    expect(isStoreConfigured("android")).toBe(false)
    expect(isStoreConfigured("ios")).toBe(true)
  })
})
