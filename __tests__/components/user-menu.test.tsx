/**
 * @jest-environment jsdom
 */
import React from "react"
import { act } from "react"
import { createRoot } from "react-dom/client"

const mockSignOut = jest.fn()
jest.mock("next-auth/react", () => ({ signOut: (...args: unknown[]) => mockSignOut(...args) }))
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

import { UserMenu } from "@/components/nav/UserMenu"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function mount(props: Partial<React.ComponentProps<typeof UserMenu>> = {}) {
  const el = document.createElement("div")
  document.body.appendChild(el)
  const root = createRoot(el)
  act(() => {
    root.render(<UserMenu name="Franco Pérez" isAdmin={false} showFavorites {...props} />)
  })
  return { el, root }
}

describe("UserMenu (barra de compu)", () => {
  afterEach(() => {
    document.body.innerHTML = ""
    mockSignOut.mockReset()
  })

  it("muestra la inicial y el nombre, y abre el menú con Favoritos y Cerrar sesión", () => {
    const { el } = mount()
    const trigger = el.querySelector("button[aria-haspopup=menu]") as HTMLButtonElement
    expect(trigger.textContent).toContain("F")
    expect(trigger.textContent).toContain("Franco")
    expect(el.querySelector("[role=menu]")).toBeNull()
    act(() => trigger.click())
    expect(trigger.getAttribute("aria-expanded")).toBe("true")
    const items = [...el.querySelectorAll("[role=menuitem]")].map((i) => i.textContent)
    expect(items).toEqual(["Mi perfil", "Favoritos", "Listas", "Cerrar sesión"])
  })

  it("admin ve el panel; Escape y clic afuera cierran; Cerrar sesión llama a signOut", () => {
    const { el } = mount({ isAdmin: true })
    const trigger = el.querySelector("button[aria-haspopup=menu]") as HTMLButtonElement
    act(() => trigger.click())
    expect(el.textContent).toContain("Panel de administración")
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
    })
    expect(el.querySelector("[role=menu]")).toBeNull()

    act(() => trigger.click())
    act(() => {
      document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }))
    })
    expect(el.querySelector("[role=menu]")).toBeNull()

    act(() => trigger.click())
    const logout = [...el.querySelectorAll("[role=menuitem]")].find((i) => i.textContent === "Cerrar sesión") as HTMLButtonElement
    act(() => logout.click())
    expect(mockSignOut).toHaveBeenCalledTimes(1)
  })
})
