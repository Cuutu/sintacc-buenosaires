/**
 * @jest-environment jsdom
 */
import React from "react"
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { readFileSync } from "fs"
import path from "path"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let mockPathname = "/"
jest.mock("next/navigation", () => ({ usePathname: () => mockPathname }))
jest.mock("@/lib/native-app", () => ({ isNativeApp: jest.fn(() => false) }))
// El modal real se baja con next/dynamic; acá alcanza con saber si se monta.
jest.mock("next/dynamic", () => () => function OnboardingModalStub() {
  return React.createElement("div", { "data-testid": "onboarding-modal" })
})

import { OnboardingGate } from "@/components/onboarding/OnboardingGate"
import { isNativeApp } from "@/lib/native-app"

function render(): { root: Root; el: HTMLDivElement } {
  const el = document.createElement("div")
  document.body.appendChild(el)
  const root = createRoot(el)
  act(() => root.render(<OnboardingGate />))
  return { root, el }
}

describe("OnboardingGate", () => {
  beforeEach(() => {
    localStorage.clear()
    ;(isNativeApp as jest.Mock).mockReturnValue(false)
    document.body.innerHTML = ""
  })

  it("en la home, a quien no la vio, monta la bienvenida", () => {
    mockPathname = "/"
    const { el } = render()
    expect(el.querySelector("[data-testid=onboarding-modal]")).not.toBeNull()
  })

  it.each(["/lugar/la-casa-del-celiaco-cordoba", "/sin-gluten/cordoba", "/guias", "/mapa"])(
    "en %s no monta nada",
    (p) => {
      mockPathname = p
      const { el } = render()
      expect(el.querySelector("[data-testid=onboarding-modal]")).toBeNull()
    }
  )

  it("si ya la vio, no la vuelve a montar", () => {
    mockPathname = "/"
    localStorage.setItem("celimap_onboarded", "1")
    const { el } = render()
    expect(el.querySelector("[data-testid=onboarding-modal]")).toBeNull()
  })

  it("dentro de la app no se muestra", () => {
    mockPathname = "/"
    ;(isNativeApp as jest.Mock).mockReturnValue(true)
    const { el } = render()
    expect(el.querySelector("[data-testid=onboarding-modal]")).toBeNull()
  })

  it("el layout usa el gate y no importa el modal directo", () => {
    const layout = readFileSync(path.join(__dirname, "../../app/layout.tsx"), "utf8")
    expect(layout).toContain("<OnboardingGate />")
    expect(layout).not.toContain("onboarding/OnboardingModal")
  })
})
