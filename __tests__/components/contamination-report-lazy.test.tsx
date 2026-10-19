/**
 * @jest-environment jsdom
 */
import React, { act } from "react"
import { createRoot } from "react-dom/client"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

jest.mock("sonner", () => ({ toast: { error: jest.fn() } }))
jest.mock("@/components/contamination-report-form", () => ({
  ContaminationReportForm: ({
    trigger,
    defaultOpen,
    placeId,
  }: {
    trigger: React.ReactNode
    defaultOpen?: boolean
    placeId: string
  }) =>
    React.createElement(
      "div",
      { "data-testid": "report-form", "data-open": String(Boolean(defaultOpen)), "data-place": placeId },
      trigger
    ),
}))

import { LazyContaminationReportForm } from "@/components/contamination-report-lazy"

describe("LazyContaminationReportForm", () => {
  it("muestra el mismo botón y al tocarlo baja el formulario y lo abre", async () => {
    const el = document.createElement("div")
    document.body.appendChild(el)
    const root = createRoot(el)
    act(() =>
      root.render(
        <LazyContaminationReportForm
          placeId="abc"
          trigger={<button type="button">Reportar</button>}
        />
      )
    )
    expect(el.querySelector("[data-testid=report-form]")).toBeNull()
    const button = el.querySelector("button")!
    expect(button.textContent).toBe("Reportar")

    await act(async () => {
      button.click()
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    const form = el.querySelector("[data-testid=report-form]")
    expect(form?.getAttribute("data-open")).toBe("true")
    expect(form?.getAttribute("data-place")).toBe("abc")
    expect(form?.querySelector("button")?.textContent).toBe("Reportar")
    act(() => root.unmount())
  })
})
