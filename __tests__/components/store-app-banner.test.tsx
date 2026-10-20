/**
 * @jest-environment jsdom
 */
import React from "react"
import { act } from "react"
import fs from "fs"
import path from "path"
import { createRoot, type Root } from "react-dom/client"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let mockPathname = "/mapa"
jest.mock("next/navigation", () => ({ usePathname: () => mockPathname }))
jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => React.createElement("img", { alt: "", src: String(props.src) }),
}))
jest.mock("@/lib/analytics", () => ({ trackEvent: jest.fn() }))
jest.mock("@/lib/use-bottom-prompt", () => ({
  useBottomPrompt: () => ({
    prompt: "store",
    browser: "chrome",
    store: "android",
    ready: true,
    debugBanner: false,
    dismissStore: jest.fn(),
  }),
}))

import { StoreAppBanner } from "@/components/store-banner/StoreAppBanner"
import { setMapOverlayOpen, STORE_BANNER_UNLOCK_KEY } from "@/lib/bottom-prompt"

const root = path.join(__dirname, "../..")
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8")

function render(): { root: Root; el: HTMLDivElement } {
  const el = document.createElement("div")
  document.body.appendChild(el)
  const r = createRoot(el)
  act(() => r.render(<StoreAppBanner />))
  return { root: r, el }
}

const space = () => document.documentElement.style.getPropertyValue("--store-banner-space")

describe("cartel de la app", () => {
  beforeEach(() => {
    document.body.innerHTML = ""
    document.documentElement.removeAttribute("style")
    sessionStorage.setItem(STORE_BANNER_UNLOCK_KEY, "1")
    act(() => setMapOverlayOpen(false))
    mockPathname = "/mapa"
  })

  it("visible: avisa cuánto ocupa para que el resto se corra arriba", () => {
    const { el, root: r } = render()
    expect(el.querySelector("[data-store-banner]")).not.toBeNull()
    expect(space()).toMatch(/^\d+px$/)
    act(() => r.unmount())
    expect(space()).toBe("")
  })

  it("con algo abierto en el mapa se esconde y deja de ocupar lugar", () => {
    const { el } = render()
    expect(el.querySelector("[data-store-banner]")).not.toBeNull()

    act(() => setMapOverlayOpen(true))
    expect(el.querySelector("[data-store-banner]")).toBeNull()
    expect(space()).toBe("")

    act(() => setMapOverlayOpen(false))
    expect(el.querySelector("[data-store-banner]")).not.toBeNull()
  })

  it("en la home no aparece", () => {
    mockPathname = "/"
    const { el } = render()
    expect(el.querySelector("[data-store-banner]")).toBeNull()
  })

  it("CeliBot, el botón de ubicación, 'Ver lugares' y el footer suman lo que ocupa el cartel", () => {
    expect(read("components/chat/ChatWidget.tsx")).toContain("var(--store-banner-space,0px)")
    expect(read("components/chat/chat-ui.css")).toContain("var(--store-banner-space, 0px)")
    const mobile = read("components/map-view/MapMobile.tsx")
    expect(mobile).toContain("setMapOverlayOpen(overlayOpen)")
    expect(mobile).toContain("var(--bottom-nav-clearance) + 0.5rem + var(--store-banner-space, 0px)")
    expect(mobile).toContain("bottom-[calc(var(--bottom-nav-clearance)+var(--store-banner-space,0px))]")
    expect(read("components/footer.tsx")).toContain("h-[var(--store-banner-space,0px)]")
  })
})
