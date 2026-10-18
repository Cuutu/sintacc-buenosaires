/**
 * @jest-environment node
 */
import {
  isWebVitalMetric,
  percentile,
  rateWebVital,
  roundWebVitalValue,
  webVitalAudience,
  webVitalRouteGroup,
} from "@/lib/web-vitals"
import { summarizeWebVitals } from "@/lib/web-vitals-server"
import { parseAnalyticsIngestBody } from "@/lib/analytics-ingest"
import { FIRST_PARTY_EVENTS, isAnalyticsEvent } from "@/lib/analytics-catalog"

jest.mock("@/lib/mongodb", () => ({ __esModule: true, default: jest.fn() }))
jest.mock("@/models/ProductEvent", () => ({ ProductEvent: {} }))

describe("webVitalRouteGroup", () => {
  it.each([
    ["/", "home"],
    ["/mapa", "mapa"],
    ["/mapa?list=open", "mapa"],
    ["/mapa-sin-tacc", "mapa"],
    ["/lugar/la-casa-del-celiaco-cordoba", "lugar"],
    ["/sin-gluten/cordoba", "ciudad"],
    ["/sin-gluten/cordoba/panaderias", "ciudad"],
    ["/top-sin-gluten/ciudad/rosario", "ciudad"],
    ["/sin-gluten/provincia/caba", "provincia"],
    ["/categoria/bares", "categoria"],
    ["/emprendimientos/mi-marca", "emprendimientos"],
    ["/listas/privadas/abcdefgh12345678", "listas"],
    ["/guias/bares-sin-tacc", "guias"],
    ["/que-es-celimap", "institucional"],
    ["/algo-raro", "otras"],
  ])("%s → %s", (path, group) => {
    expect(webVitalRouteGroup(path)).toBe(group)
  })

  it("nunca devuelve el slug ni el token de una lista privada", () => {
    expect(webVitalRouteGroup("/listas/privadas/tok_secreto_123456")).toBe("listas")
  })
})

describe("métricas", () => {
  it("reconoce solo las cinco métricas que guardamos", () => {
    expect(isWebVitalMetric("LCP")).toBe(true)
    expect(isWebVitalMetric("Next.js-hydration")).toBe(false)
    expect(isWebVitalMetric("FID")).toBe(false)
  })

  it("usa los umbrales de web.dev", () => {
    expect(rateWebVital("LCP", 2500)).toBe("good")
    expect(rateWebVital("LCP", 2501)).toBe("needs-improvement")
    expect(rateWebVital("LCP", 4001)).toBe("poor")
    expect(rateWebVital("INP", 200)).toBe("good")
    expect(rateWebVital("CLS", 0.26)).toBe("poor")
  })

  it("redondea CLS a 3 decimales y el resto a ms", () => {
    expect(roundWebVitalValue("CLS", 0.123456)).toBe(0.123)
    expect(roundWebVitalValue("LCP", 1234.6)).toBe(1235)
    expect(roundWebVitalValue("INP", Number.NaN)).toBe(0)
  })

  it("p75 con interpolación", () => {
    expect(percentile([], 0.75)).toBeNull()
    expect(percentile([5], 0.75)).toBe(5)
    expect(percentile([1, 2, 3, 4, 5], 0.75)).toBe(4)
    expect(percentile([10, 20, 30, 40], 0.75)).toBe(32.5)
  })

  it("separa app, web en celular y web en compu", () => {
    expect(webVitalAudience("android_native", "mobile")).toBe("app")
    expect(webVitalAudience("ios_native", "")).toBe("app")
    expect(webVitalAudience("web", "mobile")).toBe("web_mobile")
    expect(webVitalAudience("pwa", "")).toBe("web_mobile")
    expect(webVitalAudience("web", "desktop")).toBe("web_desktop")
  })
})

describe("summarizeWebVitals", () => {
  const vital = (route: string, metric: string, value: number, platform = "web", device = "mobile") => ({
    platform,
    device,
    props: { metric, value, route },
  })

  it("calcula p75 por ruta y público, más una fila con todas las páginas", () => {
    const rows = summarizeWebVitals([
      vital("home", "LCP", 1000),
      vital("home", "LCP", 2000),
      vital("home", "LCP", 3000),
      vital("home", "LCP", 4000),
      vital("mapa", "LCP", 9000),
      vital("mapa", "LCP", 9000, "android_native", "mobile"),
      vital("home", "CLS", 0.05),
    ])
    const home = rows.find((r) => r.route === "home" && r.audience === "web_mobile")
    expect(home?.metrics.LCP).toEqual({ p75: 3250, samples: 4, rating: "needs-improvement" })
    expect(home?.metrics.CLS).toEqual({ p75: 0.05, samples: 1, rating: "good" })
    const all = rows.find((r) => r.route === "todas" && r.audience === "web_mobile")
    expect(all?.metrics.LCP?.samples).toBe(5)
    expect(rows.find((r) => r.route === "mapa" && r.audience === "app")?.metrics.LCP?.rating).toBe("poor")
    // "todas" va primero dentro de cada público
    expect(rows[0]).toMatchObject({ route: "todas", audience: "web_mobile" })
  })

  it("ignora métricas desconocidas y valores inválidos", () => {
    const rows = summarizeWebVitals([
      vital("home", "FID", 10),
      vital("home", "LCP", -1),
      { platform: "web", device: "mobile", props: { metric: "LCP", value: "x", route: "home" } },
    ])
    expect(rows).toEqual([])
  })
})

describe("ingesta de web_vital", () => {
  it("es un evento first-party y acepta sus props", () => {
    expect(isAnalyticsEvent("web_vital")).toBe(true)
    expect(FIRST_PARTY_EVENTS.has("web_vital")).toBe(true)
    const parsed = parseAnalyticsIngestBody({
      events: [
        {
          name: "web_vital",
          distinctId: "abcdefgh1234",
          platform: "android_native",
          ts: Date.now(),
          props: { metric: "LCP", value: 2310, rating: "good", route: "lugar", navType: "navigate", extra: "x" },
        },
      ],
    })
    expect("events" in parsed && parsed.events[0].props).toEqual({
      metric: "LCP",
      value: 2310,
      rating: "good",
      route: "lugar",
      navType: "navigate",
    })
  })
})
