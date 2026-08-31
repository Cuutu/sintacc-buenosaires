/**
 * @jest-environment node
 */
import fs from "fs"
import path from "path"
import { trackEvent } from "@/lib/analytics"
import { getStoreBannerBrowser } from "@/lib/device-platform"
import { sanitizeAnalyticsProps } from "@/lib/analytics-sanitize"

jest.mock("@vercel/analytics", () => ({
  track: jest.fn(),
}))

const { track } = jest.requireMock("@vercel/analytics") as { track: jest.Mock }

describe("trackEvent + Vercel custom props", () => {
  beforeEach(() => {
    track.mockClear()
    jest.spyOn(console, "log").mockImplementation(() => undefined)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("props store/browser son string planos, no objetos", () => {
    const browser = getStoreBannerBrowser(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/123.0.6312.52 Mobile/15E148 Safari/604.1"
    )
    const props = sanitizeAnalyticsProps({ store: "ios", browser })
    expect(props).toEqual({ store: "ios", browser: "chrome" })
    expect(typeof props?.store).toBe("string")
    expect(typeof props?.browser).toBe("string")
  })

  it("browser solo enum string", () => {
    const allowed = new Set(["safari", "chrome", "instagram", "facebook", "whatsapp", "other"])
    expect(allowed.has(getStoreBannerBrowser("Instagram 1.0 iPhone"))).toBe(true)
  })

  it("en no-production loguea evento y props", () => {
    expect(process.env.NODE_ENV).not.toBe("production")
    trackEvent("store_banner_shown", { store: "ios", browser: "chrome" })
    expect(console.log).toHaveBeenCalledWith("[analytics]", "store_banner_shown", {
      store: "ios",
      browser: "chrome",
    })
    expect(track).toHaveBeenCalledWith("store_banner_shown", {
      store: "ios",
      browser: "chrome",
    })
  })
})

describe("layout Analytics + itunes", () => {
  it("monta Analytics y meta itunes", () => {
    const src = fs.readFileSync(path.join(__dirname, "../../app/layout.tsx"), "utf8")
    expect(src).toContain('from "@vercel/analytics/next"')
    expect(src).toContain("<Analytics />")
    expect(src).not.toContain("@vercel/analytics/react")
    expect(src).toContain("metadataBase")
    expect(src).toContain('appId: "6797278308"')
    expect(src).toContain('appArgument: "https://www.celimap.com.ar"')
  })
})
