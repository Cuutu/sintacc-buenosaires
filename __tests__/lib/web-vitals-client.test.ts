import { __resetWebVitalsClientForTests, reportWebVital } from "@/lib/web-vitals-client"

const mockEnqueue = jest.fn()
jest.mock("@/lib/analytics-client", () => ({
  enqueueFirstPartyEvent: (...args: unknown[]) => mockEnqueue(...args),
}))

describe("reportWebVital", () => {
  beforeEach(() => {
    mockEnqueue.mockClear()
    __resetWebVitalsClientForTests()
    window.history.replaceState(null, "", "/lugar/un-lugar")
  })

  it("manda la métrica redondeada con la ruta de entrada agrupada", () => {
    reportWebVital({ name: "LCP", value: 2310.4, rating: "good", navigationType: "navigate" })
    expect(mockEnqueue).toHaveBeenCalledWith("web_vital", {
      metric: "LCP",
      value: 2310,
      route: "lugar",
      rating: "good",
      navType: "navigate",
    })
  })

  it("atribuye a la ruta de entrada aunque el usuario ya haya navegado", () => {
    reportWebVital({ name: "TTFB", value: 120 })
    window.history.replaceState(null, "", "/mapa")
    reportWebVital({ name: "CLS", value: 0.0421 })
    expect(mockEnqueue).toHaveBeenLastCalledWith("web_vital", {
      metric: "CLS",
      value: 0.042,
      route: "lugar",
    })
  })

  it("ignora las métricas propias de Next", () => {
    reportWebVital({ name: "Next.js-hydration", value: 40 })
    expect(mockEnqueue).not.toHaveBeenCalled()
  })
})
