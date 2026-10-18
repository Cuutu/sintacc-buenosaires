/**
 * @jest-environment node
 */
import fs from "fs"
import path from "path"
import { trackEvent } from "@/lib/analytics"
import { getStoreBannerBrowser } from "@/lib/device-platform"
import { sanitizeAnalyticsProps } from "@/lib/analytics-sanitize"

const mockEnqueue = jest.fn()
jest.mock("@/lib/analytics-client", () => ({
  enqueueFirstPartyEvent: (...args: unknown[]) => mockEnqueue(...args),
}))

describe("trackEvent (first-party)", () => {
  beforeEach(() => {
    mockEnqueue.mockClear()
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
    expect(mockEnqueue).toHaveBeenCalledWith("store_banner_shown", {
      store: "ios",
      browser: "chrome",
    })
  })
})

describe("layout Analytics + itunes", () => {
  it("sin Vercel Analytics ni Speed Insights (no andan en el VPS); Smart App Banner no está en home (fold)", () => {
    const src = fs.readFileSync(path.join(__dirname, "../../app/layout.tsx"), "utf8")
    const home = fs.readFileSync(path.join(__dirname, "../../app/page.tsx"), "utf8")
    const mapa = fs.readFileSync(path.join(__dirname, "../../app/mapa/layout.tsx"), "utf8")
    const itunes = fs.readFileSync(path.join(__dirname, "../../lib/seo/itunes.ts"), "utf8")
    expect(src).not.toContain("@vercel/analytics")
    expect(src).not.toContain("@vercel/speed-insights")
    expect(src).toContain("<WebVitalsReporter />")
    expect(src).toContain("metadataBase")
    expect(src).not.toContain("itunes:")
    expect(home).not.toContain("itunes:")
    expect(itunes).toContain('appId: "6797278308"')
    expect(itunes).toContain('appArgument: "https://www.celimap.com.ar"')
    expect(mapa).toContain("CELIMAP_ITUNES")
    expect(mapa).toContain("itunes:")
  })
})
