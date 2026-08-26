/**
 * @jest-environment jsdom
 */
import { Capacitor } from "@capacitor/core"
import { getCapacitorPlatform, isNativeApp, isNativeAndroidApp, isNativeIosApp } from "@/lib/native-app"

jest.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: jest.fn(() => false),
    getPlatform: jest.fn(() => "web"),
  },
}))

const mockedCapacitor = Capacitor as jest.Mocked<typeof Capacitor>

type Bridge = {
  isNativePlatform?: () => boolean
  getPlatform?: () => string
}

function setWindowCapacitor(bridge: Bridge | undefined) {
  ;(window as Window & { Capacitor?: Bridge }).Capacitor = bridge
}

function setUserAgent(ua: string, maxTouchPoints = 0) {
  Object.defineProperty(window.navigator, "userAgent", {
    value: ua,
    configurable: true,
  })
  Object.defineProperty(window.navigator, "maxTouchPoints", {
    value: maxTouchPoints,
    configurable: true,
  })
}

describe("native iOS / iPadOS detection", () => {
  beforeEach(() => {
    document.documentElement.className = ""
    setWindowCapacitor(undefined)
    mockedCapacitor.isNativePlatform.mockReturnValue(false)
    mockedCapacitor.getPlatform.mockReturnValue("web")
    setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      0
    )
  })

  it("web Safari / Chrome no es nativo", () => {
    expect(isNativeApp()).toBe(false)
    expect(isNativeIosApp()).toBe(false)
  })

  it("iPhone nativo via window.Capacitor.getPlatform() === ios", () => {
    setWindowCapacitor({
      isNativePlatform: () => true,
      getPlatform: () => "ios",
    })
    mockedCapacitor.getPlatform.mockReturnValue("web")
    setUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 CelimapNative/1"
    )
    expect(getCapacitorPlatform()).toBe("ios")
    expect(isNativeApp()).toBe(true)
    expect(isNativeIosApp()).toBe(true)
  })

  it("iPadOS desktop UA (Macintosh) + native bridge sigue siendo iOS", () => {
    setWindowCapacitor({
      isNativePlatform: () => true,
      getPlatform: () => "ios",
    })
    setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15 CelimapNative/1",
      5
    )
    expect(isNativeIosApp()).toBe(true)
  })

  it("iPadOS Macintosh UA + bundled Capacitor web + CelimapNative = iOS", () => {
    setWindowCapacitor({
      isNativePlatform: () => false,
      getPlatform: () => "web",
    })
    mockedCapacitor.isNativePlatform.mockReturnValue(false)
    mockedCapacitor.getPlatform.mockReturnValue("web")
    setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 CelimapNative/1",
      5
    )
    expect(isNativeApp()).toBe(true)
    expect(isNativeIosApp()).toBe(true)
  })

  it("iPadOS Macintosh UA sin maxTouchPoints, native shell, Capacitor web = iOS", () => {
    setWindowCapacitor(undefined)
    mockedCapacitor.getPlatform.mockReturnValue("web")
    setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 CelimapNative/1",
      0
    )
    expect(isNativeApp()).toBe(true)
    expect(isNativeIosApp()).toBe(true)
  })

  it("Android nativo no es iOS", () => {
    setWindowCapacitor({
      isNativePlatform: () => true,
      getPlatform: () => "android",
    })
    setUserAgent(
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 CelimapNative/1"
    )
    expect(isNativeApp()).toBe(true)
    expect(isNativeIosApp()).toBe(false)
    expect(isNativeAndroidApp()).toBe(true)
  })

  it("Macintosh web sin CelimapNative no es iOS", () => {
    setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15",
      0
    )
    expect(isNativeApp()).toBe(false)
    expect(isNativeIosApp()).toBe(false)
  })

  it("prefers window.Capacitor.getPlatform over bundled core", () => {
    setWindowCapacitor({
      isNativePlatform: () => true,
      getPlatform: () => "ios",
    })
    mockedCapacitor.getPlatform.mockReturnValue("web")
    expect(getCapacitorPlatform()).toBe("ios")
  })
})
