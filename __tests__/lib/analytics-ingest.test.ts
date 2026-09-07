import { parseAnalyticsIngestBody, detectDeviceFromUa, isAnalyticsIngestContentType } from "@/lib/analytics-ingest"

describe("parseAnalyticsIngestBody", () => {
  const base = {
    name: "place_view",
    distinctId: "abc12345deadbeef",
    platform: "web",
    authenticated: false,
    ts: Date.now(),
    source: "instagram",
    medium: "social",
    campaign: "lanzamiento",
    referrerHost: "instagram.com",
    entryPath: "/mapa",
    props: { placeId: "64b000000000000000000001", city: "cordoba", category: "bakery" },
  }

  it("acepta evento first-party válido", () => {
    const parsed = parseAnalyticsIngestBody({ events: [base] })
    expect("events" in parsed).toBe(true)
    if ("error" in parsed) throw new Error(parsed.error)
    expect(parsed.events).toHaveLength(1)
    expect(parsed.events[0].name).toBe("place_view")
    expect(parsed.events[0].props.placeId).toBe("64b000000000000000000001")
    expect(parsed.events[0].source).toBe("instagram")
  })

  it("descarta eventos que no van a Mongo", () => {
    const parsed = parseAnalyticsIngestBody({
      events: [{ ...base, name: "store_banner_shown" }],
    })
    expect(parsed).toEqual({ error: "empty" })
  })

  it("descarta distinctId corto o con email", () => {
    expect(
      parseAnalyticsIngestBody({ events: [{ ...base, distinctId: "abc" }] })
    ).toEqual({ error: "empty" })
    expect(
      parseAnalyticsIngestBody({
        events: [{ ...base, distinctId: "user@example.com-token" }],
      })
    ).toEqual({ error: "empty" })
  })

  it("no persiste email en props", () => {
    const parsed = parseAnalyticsIngestBody({
      events: [{ ...base, props: { email: "a@b.com", placeId: "64b000000000000000000001" } }],
    })
    if ("error" in parsed) throw new Error(parsed.error)
    expect(parsed.events[0].props).toEqual({ placeId: "64b000000000000000000001" })
  })

  it("rebota path /admin a /", () => {
    const parsed = parseAnalyticsIngestBody({
      events: [{ ...base, entryPath: "/admin/analytics" }],
    })
    if ("error" in parsed) throw new Error(parsed.error)
    expect(parsed.events[0].entryPath).toBe("/")
  })

  it("detecta device desde UA", () => {
    expect(detectDeviceFromUa("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0")).toBe("mobile")
    expect(detectDeviceFromUa("Mozilla/5.0 (iPad; CPU OS 17_0")).toBe("tablet")
    expect(detectDeviceFromUa("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("desktop")
  })

  it("acepta version nativa y descarta basura", () => {
    const ok = parseAnalyticsIngestBody({
      events: [{ ...base, platform: "android_native", appVersion: "1.0.0 (12)" }],
    })
    if ("error" in ok) throw new Error(ok.error)
    expect(ok.events[0].appVersion).toBe("1.0.0 (12)")
    expect(ok.events[0].platform).toBe("android_native")

    const bad = parseAnalyticsIngestBody({
      events: [{ ...base, appVersion: "user@mail.com" }],
    })
    if ("error" in bad) throw new Error(bad.error)
    expect(bad.events[0].appVersion).toBe("")
  })
})

describe("isAnalyticsIngestContentType", () => {
  it("acepta json, text/plain y vacío (sendBeacon)", () => {
    expect(isAnalyticsIngestContentType("application/json")).toBe(true)
    expect(isAnalyticsIngestContentType("application/json; charset=UTF-8")).toBe(true)
    expect(isAnalyticsIngestContentType("text/plain;charset=UTF-8")).toBe(true)
    expect(isAnalyticsIngestContentType("")).toBe(true)
    expect(isAnalyticsIngestContentType("text/html")).toBe(false)
  })
})
