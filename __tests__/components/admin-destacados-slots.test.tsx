/**
 * @jest-environment jsdom
 */
import React from "react"
import { act } from "react"
import { createRoot } from "react-dom/client"
import { AdminFeaturedSection, emptyFeaturedPositions, featuredSlotsLabel } from "@/components/admin/AdminFeaturedSection"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
jest.mock("next/image", () => ({ __esModule: true, default: (p: { src: string; alt: string }) => React.createElement("img", { src: p.src, alt: p.alt }) }))
jest.mock("sonner", () => ({ toast: { error: jest.fn(), success: jest.fn(), message: jest.fn() } }))

describe("Destacados: posiciones y lugares libres", () => {
  it("cuenta ocupados sobre el máximo y lista las posiciones libres", () => {
    expect(featuredSlotsLabel(5, 6)).toBe("5 de 6")
    expect(emptyFeaturedPositions(5, 6)).toEqual([6])
    expect(emptyFeaturedPositions(0, 3)).toEqual([1, 2, 3])
    expect(emptyFeaturedPositions(6, 6)).toEqual([])
    expect(emptyFeaturedPositions(7, 6)).toEqual([])
  })

  it("numera cada destacado y muestra el lugar libre", async () => {
    const places = ["Polvorín", "Sintaxis", "La Esquina", "Dulce", "Celíacos"].map((name, i) => ({
      _id: `p${i}`,
      name,
      neighborhood: "Palermo",
      type: "cafe",
      photos: [],
    }))
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ places, max: 6 }) })) as unknown as typeof fetch
    const el = document.createElement("div")
    document.body.appendChild(el)
    await act(async () => {
      createRoot(el).render(<AdminFeaturedSection />)
    })
    await act(async () => {
      await Promise.resolve()
    })
    const positions = Array.from(el.querySelectorAll("[aria-label^='Posición']")).map((n) => n.textContent)
    expect(positions).toEqual(["1", "2", "3", "4", "5", "6"])
    expect(el.textContent).toContain("5 de 6 lugares")
    expect(el.textContent).toContain("Lugar libre")
    expect(el.querySelectorAll("article[draggable]")).toHaveLength(5)
  })
})
