/**
 * @jest-environment jsdom
 */

/** Boundary: page fallback, resetKey, chrome no tumba page. */
import React from "react"
import { createRoot, Root } from "react-dom/client"
import { act } from "react-dom/test-utils"
import { AppErrorBoundary } from "@/components/AppErrorBoundary"

function Boom({ label }: { label: string }): React.ReactElement {
  throw new Error(`boom:${label}`)
}

function Safe({ label }: { label: string }) {
  return <div data-testid="safe">{label}</div>
}

describe("AppErrorBoundary runtime", () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)
    jest.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
    ;(console.error as jest.Mock).mockRestore?.()
  })

  it("error de página → fallback", () => {
    act(() => {
      root.render(
        <AppErrorBoundary resetKey="/a">
          <Boom label="a" />
        </AppErrorBoundary>
      )
    })
    expect(container.querySelector('[data-testid="app-error-boundary"]')).toBeTruthy()
    expect(container.textContent).toMatch(/Algo falló/)
  })

  it("cambio resetKey → recupera children", () => {
    act(() => {
      root.render(
        <AppErrorBoundary resetKey="/favoritos">
          <Boom label="fav" />
        </AppErrorBoundary>
      )
    })
    expect(container.querySelector('[data-testid="app-error-boundary"]')).toBeTruthy()

    act(() => {
      root.render(
        <AppErrorBoundary resetKey="/perfil">
          <Safe label="perfil-ok" />
        </AppErrorBoundary>
      )
    })
    expect(container.querySelector('[data-testid="app-error-boundary"]')).toBeFalsy()
    expect(container.querySelector('[data-testid="safe"]')?.textContent).toBe("perfil-ok")
  })

  it("BottomNav chrome error no reemplaza contenido hermano", () => {
    act(() => {
      root.render(
        <div>
          <main>
            <Safe label="main-ok" />
          </main>
          <AppErrorBoundary variant="chrome">
            <Boom label="nav" />
          </AppErrorBoundary>
        </div>
      )
    })
    expect(container.querySelector('[data-testid="safe"]')?.textContent).toBe("main-ok")
    expect(container.querySelector('[data-testid="bottom-nav-error-boundary"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="app-error-boundary"]')).toBeFalsy()
  })
})
