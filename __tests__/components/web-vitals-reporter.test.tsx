/**
 * @jest-environment jsdom
 */
import { act } from "react"
import { createRoot } from "react-dom/client"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const onLCP = jest.fn()
const onCLS = jest.fn()
const onINP = jest.fn()
const onFCP = jest.fn()
const onTTFB = jest.fn()
jest.mock("next/dist/compiled/web-vitals", () => ({ onLCP, onCLS, onINP, onFCP, onTTFB }))

const mockEnqueue = jest.fn()
jest.mock("@/lib/analytics-client", () => ({
  enqueueFirstPartyEvent: (...args: unknown[]) => mockEnqueue(...args),
}))

import { WebVitalsReporter } from "@/components/analytics/WebVitalsReporter"
import { __resetWebVitalsClientForTests } from "@/lib/web-vitals-client"

describe("WebVitalsReporter", () => {
  beforeEach(() => {
    __resetWebVitalsClientForTests()
    window.history.replaceState(null, "", "/lugar/un-lugar")
  })

  it("carga web-vitals después del load y atribuye a la ruta de entrada", async () => {
    jest.useFakeTimers()
    const el = document.createElement("div")
    const root = createRoot(el)
    act(() => root.render(<WebVitalsReporter />))
    // Todavía no: espera a que el navegador esté libre.
    expect(onLCP).not.toHaveBeenCalled()

    // El usuario navega antes de que cargue la librería.
    window.history.replaceState(null, "", "/mapa")
    await act(async () => {
      jest.advanceTimersByTime(1000)
    })
    jest.useRealTimers()
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    for (const fn of [onLCP, onCLS, onINP, onFCP, onTTFB]) expect(fn).toHaveBeenCalledTimes(1)
    const report = onLCP.mock.calls[0][0] as (m: { name: string; value: number }) => void
    report({ name: "LCP", value: 1800 })
    expect(mockEnqueue).toHaveBeenCalledWith("web_vital", expect.objectContaining({ metric: "LCP", route: "lugar" }))

    act(() => root.unmount())
  })
})
