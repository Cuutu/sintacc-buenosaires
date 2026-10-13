/**
 * @jest-environment jsdom
 */
import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { MapTopBar, type MapFilters } from "@/components/map-view/MapTopBar"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

/**
 * Selector de seguridad del mapa mobile (Todos / 100% sin TACC / Con opciones).
 * Invariantes: es excluyente, no toca otros tags (cocina_separada, delivery…) y
 * expone el estado con role="radio" + aria-checked.
 */
describe("MapTopBar — selector de seguridad mobile", () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    // jsdom no trae matchMedia (lo usa usePrefersReducedMotion).
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }))
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  function render(filters: MapFilters, onFiltersChange = jest.fn()) {
    act(() => {
      root.render(
        <MapTopBar filters={filters} onFiltersChange={onFiltersChange} onSearchChange={jest.fn()} />
      )
    })
    return onFiltersChange
  }

  function radio(name: string): HTMLButtonElement {
    const el = container.querySelector(`[role="radio"][aria-label="${name}"]`)
    if (!el) throw new Error(`no radio ${name}`)
    return el as HTMLButtonElement
  }

  it("sin tags de seguridad marca Todos", () => {
    render({ search: "", tags: [] })
    expect(radio("Todos").getAttribute("aria-checked")).toBe("true")
    expect(radio("100% sin TACC").getAttribute("aria-checked")).toBe("false")
  })

  it("elegir 100% reemplaza opciones y conserva otros tags", () => {
    const onChange = render({ search: "", tags: ["opciones_sin_tacc", "delivery"] })
    expect(radio("Con opciones").getAttribute("aria-checked")).toBe("true")
    act(() => radio("100% sin TACC").click())
    expect(onChange).toHaveBeenCalledWith({ search: "", tags: ["delivery", "100_gf"] })
  })

  it("Todos saca los dos tags de seguridad", () => {
    const onChange = render({ search: "", tags: ["100_gf", "cocina_separada"] })
    act(() => radio("Todos").click())
    expect(onChange).toHaveBeenCalledWith({ search: "", tags: ["cocina_separada"] })
  })

  it("si vienen los dos tags (URL vieja) se muestra Todos", () => {
    render({ search: "", tags: ["100_gf", "opciones_sin_tacc"] })
    expect(radio("Todos").getAttribute("aria-checked")).toBe("true")
  })

  it("escritorio: el mismo selector por tags (así el modo 100% se ve igual)", () => {
    const onChange = jest.fn()
    act(() => {
      root.render(
        <MapTopBar
          variant="sidebar"
          filters={{ search: "", tags: ["100_gf", "delivery"] }}
          onFiltersChange={onChange}
          onSearchChange={jest.fn()}
        />
      )
    })
    expect(radio("100% sin TACC").getAttribute("aria-checked")).toBe("true")
    expect(radio("Todos").getAttribute("aria-checked")).toBe("false")
    act(() => radio("Con opciones").click())
    expect(onChange).toHaveBeenCalledWith({
      search: "",
      tags: ["delivery", "opciones_sin_tacc"],
      safetyLevel: undefined,
    })
  })

  it("escritorio: los filtros activos se ven y se sacan sin abrir el panel", () => {
    const onChange = jest.fn()
    act(() => {
      root.render(
        <MapTopBar
          variant="sidebar"
          filters={{ search: "", tags: ["100_gf", "cocina_separada"], type: "cafe" }}
          onFiltersChange={onChange}
          onSearchChange={jest.fn()}
        />
      )
    })
    const filtros = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.startsWith("Filtros")
    )
    expect(filtros?.textContent).toBe("Filtros2")
    const quitar = container.querySelector('[aria-label="Quitar filtro Cocina separada"]') as HTMLButtonElement
    act(() => quitar.click())
    expect(onChange).toHaveBeenCalledWith({ search: "", tags: ["100_gf"], type: "cafe" })
  })
})
