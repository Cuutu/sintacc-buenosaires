import { CELIMAP_APP_STORE_URL, getDevicePlatform } from "@/lib/device-platform"

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
