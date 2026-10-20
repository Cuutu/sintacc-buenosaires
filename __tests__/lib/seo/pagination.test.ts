/**
 * @jest-environment node
 *
 * Paginación indexable de las landings (Plan SEO Q4 2026, Fase 0): cada
 * ?page=N tiene canónica propia, título propio y enlaces numerados en el HTML.
 */
import { readFileSync } from "fs"
import path from "path"
import React from "react"
import { TextEncoder, TextDecoder } from "util"
import {
  PAGINATION_SHOW_ALL_MAX,
  paginatedPath,
  paginatedTitle,
  paginationItems,
} from "@/lib/seo/pagination"

Object.assign(globalThis, { TextEncoder, TextDecoder })
const { renderToStaticMarkup } = require("react-dom/server") as typeof import("react-dom/server")
const { Pagination } = require("@/components/seo/Pagination") as typeof import("@/components/seo/Pagination")

const root = path.join(__dirname, "../../..")
const read = (rel: string) => readFileSync(path.join(root, rel), "utf8")

describe("helpers de paginación", () => {
  it("la página 1 es la URL limpia; el resto lleva ?page=N", () => {
    expect(paginatedPath("/sin-gluten/cordoba", 1)).toBe("/sin-gluten/cordoba")
    expect(paginatedPath("/sin-gluten/cordoba", 3)).toBe("/sin-gluten/cordoba?page=3")
  })

  it("el título cambia desde la página 2", () => {
    expect(paginatedTitle("Dónde comer sin TACC en Córdoba", 1)).toBe("Dónde comer sin TACC en Córdoba")
    expect(paginatedTitle("Dónde comer sin TACC en Córdoba", 2)).toBe("Dónde comer sin TACC en Córdoba – página 2")
  })

  it("muestra todos los números hasta el máximo (CABA restaurantes: 11)", () => {
    expect(paginationItems(1, 1)).toEqual([])
    expect(paginationItems(1, 11)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
    expect(paginationItems(5, PAGINATION_SHOW_ALL_MAX)).toHaveLength(PAGINATION_SHOW_ALL_MAX)
  })

  it("con muchas páginas recorta con … y nunca pierde la primera ni la última", () => {
    expect(paginationItems(1, 40)).toEqual([1, 2, 3, "gap", 39, 40])
    expect(paginationItems(20, 40)).toEqual([1, 2, "gap", 18, 19, 20, 21, 22, "gap", 39, 40])
    // Hueco de una sola página: va el número, no "…".
    expect(paginationItems(5, 40)).toEqual([1, 2, 3, 4, 5, 6, 7, "gap", 39, 40])
    expect(paginationItems(40, 40)).toEqual([1, 2, "gap", 38, 39, 40])
  })
})

describe("<Pagination>", () => {
  it("renderiza <a href> numerados en el servidor y marca la actual", () => {
    const html = renderToStaticMarkup(
      React.createElement(Pagination, { currentPage: 2, totalPages: 4, basePath: "/sin-gluten/buenos-aires" })
    )
    expect(html).toContain('href="/sin-gluten/buenos-aires"')
    expect(html).toContain('href="/sin-gluten/buenos-aires?page=3"')
    expect(html).toContain('href="/sin-gluten/buenos-aires?page=4"')
    expect(html).not.toContain('href="/sin-gluten/buenos-aires?page=1"')
    expect(html).not.toContain('href="/sin-gluten/buenos-aires?page=2"')
    expect(html).toMatch(/aria-current="page"[^>]*>2</)
    expect(html).toContain("Anterior")
    expect(html).toContain("Siguiente")
  })
})

describe("landings: ?page=N indexable con canónica propia", () => {
  const LANDINGS = [
    "app/sin-gluten/[ciudadSlug]/city-landing.tsx",
    "app/sin-gluten/[ciudadSlug]/[categoriaSlug]/category-landing.tsx",
    "app/categoria/[category]/national-category-landing.tsx",
  ]

  it.each(LANDINGS)("%s usa los helpers y no pone noindex por page > 1", (rel) => {
    const src = read(rel)
    expect(src).toContain("paginatedPath(")
    expect(src).toContain("paginatedTitle(")
    expect(src).not.toMatch(/page > 1 \? \{ index: false/)
    // La variante /filtrado solo es noindex en ?page=1, no en todas las páginas.
    expect(src).not.toMatch(/\(variant \? \{ index: false/)
  })

  it("ciudad: ?barrio= sigue en noindex con la canónica limpia", () => {
    const src = read("app/sin-gluten/[ciudadSlug]/city-landing.tsx")
    expect(src).toMatch(/barrio \? \{ index: false, follow: true \}/)
    expect(src).toMatch(/const canonical = barrio \? baseCanonical :/)
  })
})
