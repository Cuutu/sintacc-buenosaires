/**
 * @jest-environment jsdom
 */
import React from "react"
import { act } from "react"
import { createRoot } from "react-dom/client"
import { AdminReviewsSection } from "@/components/admin/AdminReviewsSection"
import { AdminVentureReviewsSection } from "@/components/admin/AdminVentureReviewsSection"
import type { ReviewItem, VentureReviewItem } from "@/components/admin/types"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, ...p }: { href: string; children: React.ReactNode }) => React.createElement("a", p, children),
}))
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

const day = 86400000
const iso = (d: number) => new Date(Date.now() - d * day).toISOString()

const reviews = [
  { _id: "r1", placeId: { _id: "p1", name: "Polvorín" }, userId: { name: "Ana" }, rating: 4, comment: "La &quot;torta&quot; buenísima", status: "visible", estado: "pendiente", createdAt: iso(3) },
  { _id: "r2", placeId: { _id: "p2", name: "La Esquina" }, userId: { name: "Luis" }, rating: 2, comment: "Nada", status: "hidden", estado: "respondido", adminReply: "Gracias", createdAt: iso(9), pinned: true },
] as unknown as ReviewItem[]

function render(node: React.ReactElement) {
  const el = document.createElement("div")
  document.body.appendChild(el)
  act(() => createRoot(el).render(node))
  return el
}

const noop = () => undefined

describe("Reseñas de lugares", () => {
  const el = () =>
    render(
      <AdminReviewsSection
        estadoFilter=""
        onEstadoFilter={noop}
        reviews={reviews}
        reviewsLoading={false}
        reviewSearch=""
        setReviewSearch={noop}
        reviewFilter=""
        setReviewFilter={noop}
        fetchReviews={noop}
        handleReviewAction={noop}
      />
    )

  it("cada reseña tiene una sola acción a la vista (Responder) y el resto en ⋯", () => {
    const articles = Array.from(el().querySelectorAll("article"))
    expect(articles).toHaveLength(2)
    const labels = articles.map((a) => Array.from(a.querySelectorAll("button")).map((b) => b.textContent?.trim() || b.getAttribute("aria-label")))
    expect(labels[0]).toEqual(["Responder", "Más acciones para la reseña sobre Polvorín"])
    expect(labels[1]).toEqual(["Editar respuesta", "Más acciones para la reseña sobre La Esquina"])
  })

  it("la visibilidad nunca va en rojo y las estrellas se leen", () => {
    const root = el()
    const badges = Array.from(root.querySelectorAll("article span")).filter((s) => /^(Visible|Oculta)$/.test(s.textContent || ""))
    expect(badges.map((b) => b.textContent)).toEqual(["Visible", "Oculta"])
    for (const b of badges) expect(b.className).not.toMatch(/danger/)
    expect(root.querySelector('[aria-label="4 de 5"]')).not.toBeNull()
    expect(root.textContent).toContain("Destacada")
    expect(root.textContent).toContain('La "torta" buenísima')
    expect(root.textContent).toContain("3 días sin resolver")
  })

  it("un solo renglón de filtros, sin emojis", () => {
    const root = el()
    expect(root.querySelectorAll('[aria-label="Estado de gestión"]').length).toBeGreaterThan(0)
    expect(root.querySelector('select[aria-label="Visibilidad"]')).not.toBeNull()
    expect(root.textContent).not.toMatch(/[\u{1F300}-\u{1FAFF}✅❌]/u)
  })
})

describe("Reseñas de emprendimientos", () => {
  it("la acción a la vista es la de gestión (no hay respuesta pública)", () => {
    const root = render(
      <AdminVentureReviewsSection
        estadoFilter=""
        onEstadoFilter={noop}
        reviews={[
          { _id: "v1", ventureId: { _id: "x", name: "Dulce" }, userId: { name: "Marta" }, rating: 5, comment: "Rico", status: "visible", estado: "pendiente", createdAt: iso(1) },
          { _id: "v2", ventureId: { _id: "y", name: "Viandas" }, userId: { name: "Pedro" }, rating: 3, comment: "Bien", status: "hidden", estado: "respondido", createdAt: iso(1) },
        ] as VentureReviewItem[]}
        loading={false}
        search=""
        setSearch={noop}
        filter=""
        setFilter={noop}
        fetchReviews={noop}
        handleAction={noop}
      />
    )
    const visible = Array.from(root.querySelectorAll("article")).map((a) =>
      Array.from(a.querySelectorAll("button")).filter((b) => !b.getAttribute("aria-label")).map((b) => b.textContent?.trim())
    )
    expect(visible).toEqual([["Marcar como respondido"], ["Reabrir"]])
  })
})
