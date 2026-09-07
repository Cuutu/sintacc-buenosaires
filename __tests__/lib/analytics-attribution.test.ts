/**
 * @jest-environment jsdom
 */
import {
  captureAnalyticsAttribution,
  classifyTrafficSource,
} from "@/lib/analytics-attribution"

describe("analytics attribution", () => {
  beforeEach(() => {
    window.localStorage.clear()
    Object.defineProperty(document, "referrer", { value: "", configurable: true })
    window.history.replaceState({}, "", "/")
  })

  it("clasifica referrers conocidos", () => {
    expect(classifyTrafficSource("", "www.google.com")).toBe("google")
    expect(classifyTrafficSource("", "l.instagram.com")).toBe("instagram")
    expect(classifyTrafficSource("", "vm.tiktok.com")).toBe("tiktok")
    expect(classifyTrafficSource("", "")).toBe("direct")
    expect(classifyTrafficSource("newsletter", "google.com")).toBe("newsletter")
  })

  it("guarda UTM en la primera visita y no pisa después", () => {
    window.history.replaceState({}, "", "/mapa?utm_source=instagram&utm_medium=social&utm_campaign=cba")
    const first = captureAnalyticsAttribution()
    expect(first).toMatchObject({
      source: "instagram",
      medium: "social",
      campaign: "cba",
      entryPath: "/mapa",
    })

    window.history.replaceState({}, "", "/lugar/x?utm_source=google")
    const second = captureAnalyticsAttribution()
    expect(second.source).toBe("instagram")
    expect(second.campaign).toBe("cba")
  })
})
