import { sanitizeSearchQuery } from "@/lib/analytics-search"
import { parseInsightsRange } from "@/lib/admin-insights-types"
import { FIRST_PARTY_EVENTS, isAnalyticsEvent } from "@/lib/analytics-catalog"

describe("sanitizeSearchQuery", () => {
  it("acepta búsquedas de producto", () => {
    expect(sanitizeSearchQuery("  panadería córdoba  ")).toBe("panadería córdoba")
  })

  it("corta PII y ruido", () => {
    expect(sanitizeSearchQuery("a")).toBeNull()
    expect(sanitizeSearchQuery("user@mail.com pan")).toBeNull()
    expect(sanitizeSearchQuery("111122223333")).toBeNull()
  })
})

describe("insights range", () => {
  it("solo permite 1d 7d 30d", () => {
    expect(parseInsightsRange("30d")).toBe("30d")
    expect(parseInsightsRange("nope")).toBe("7d")
    expect(parseInsightsRange(null)).toBe("7d")
  })
})

describe("catalogo", () => {
  it("page_viewed no existe a propósito", () => {
    expect(isAnalyticsEvent("page_viewed")).toBe(false)
    expect(isAnalyticsEvent("place_view")).toBe(true)
    expect(FIRST_PARTY_EVENTS.has("place_view")).toBe(true)
    expect(FIRST_PARTY_EVENTS.has("app_open")).toBe(false)
    expect(FIRST_PARTY_EVENTS.has("search_no_results")).toBe(true)
  })
})
