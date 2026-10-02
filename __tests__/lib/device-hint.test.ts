import { DEVICE_HINT_SCRIPT } from "@/lib/device-hint"
import { getDevicePlatform } from "@/lib/device-platform"

const UA = {
  iphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
  ipadOs: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
  android: "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36",
  windows: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
}

function runHint(userAgent: string, maxTouchPoints = 0) {
  const root = document.documentElement
  root.removeAttribute("data-device")
  root.removeAttribute("data-app-shell")
  jest.spyOn(window.navigator, "userAgent", "get").mockReturnValue(userAgent)
  Object.defineProperty(window.navigator, "maxTouchPoints", {
    value: maxTouchPoints,
    configurable: true,
  })
  new Function(DEVICE_HINT_SCRIPT)()
  return {
    device: root.getAttribute("data-device"),
    appShell: root.hasAttribute("data-app-shell"),
  }
}

afterEach(() => {
  jest.restoreAllMocks()
})

describe("DEVICE_HINT_SCRIPT", () => {
  it.each([
    ["iphone", UA.iphone, 5],
    ["iPadOS como Macintosh", UA.ipadOs, 5],
    ["Mac sin touch", UA.ipadOs, 0],
    ["android", UA.android, 5],
    ["windows", UA.windows, 0],
  ])("coincide con getDevicePlatform (%s)", (_name, userAgent, touch) => {
    expect(runHint(userAgent, touch).device).toBe(
      getDevicePlatform({ userAgent, maxTouchPoints: touch })
    )
  })

  it("marca la app nativa por el UA CelimapNative", () => {
    expect(runHint(`${UA.android} CelimapNative/1`, 5)).toEqual({
      device: "android",
      appShell: true,
    })
    expect(runHint(UA.android, 5).appShell).toBe(false)
  })
})
