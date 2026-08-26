import { getAnalyticsPlatform } from "@/lib/analytics-platform"

jest.mock("@/lib/native-app", () => ({
  isNativeApp: jest.fn(() => false),
  isNativeIosApp: jest.fn(() => false),
  isNativeAndroidApp: jest.fn(() => false),
}))

jest.mock("@/lib/device-platform", () => ({
  isStandaloneDisplay: jest.fn(() => false),
}))

const nativeApp = jest.requireMock("@/lib/native-app")
const devicePlatform = jest.requireMock("@/lib/device-platform")

describe("getAnalyticsPlatform", () => {
  beforeEach(() => {
    nativeApp.isNativeApp.mockReturnValue(false)
    nativeApp.isNativeIosApp.mockReturnValue(false)
    nativeApp.isNativeAndroidApp.mockReturnValue(false)
    devicePlatform.isStandaloneDisplay.mockReturnValue(false)
  })

  it("web en navegador normal", () => {
    expect(getAnalyticsPlatform()).toBe("web")
  })

  it("pwa en standalone", () => {
    devicePlatform.isStandaloneDisplay.mockReturnValue(true)
    expect(getAnalyticsPlatform()).toBe("pwa")
  })

  it("ios_native en shell Capacitor iOS", () => {
    nativeApp.isNativeApp.mockReturnValue(true)
    nativeApp.isNativeIosApp.mockReturnValue(true)
    expect(getAnalyticsPlatform()).toBe("ios_native")
  })

  it("android_native en shell Capacitor Android", () => {
    nativeApp.isNativeApp.mockReturnValue(true)
    nativeApp.isNativeAndroidApp.mockReturnValue(true)
    expect(getAnalyticsPlatform()).toBe("android_native")
  })
})
