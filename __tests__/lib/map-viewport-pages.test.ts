import fs from "fs"
import path from "path"
import { MAP_VIEWPORT_MAX_PAGES, nextViewportPage } from "@/lib/map-viewport-pages"

describe("nextViewportPage", () => {
  it("sigue si Mongo dice que hay más páginas", () => {
    expect(
      nextViewportPage({ page: 1, received: 100, limit: 100, totalPages: 4 })
    ).toBe(2)
    expect(
      nextViewportPage({ page: 3, received: 100, limit: 100, totalPages: 4 })
    ).toBe(4)
  })

  it("para en la última página aunque haya venido llena", () => {
    expect(
      nextViewportPage({ page: 4, received: 100, limit: 100, totalPages: 4 })
    ).toBeNull()
  })

  it("sigue según pages aunque el filtro in-memory haya acortado el batch", () => {
    expect(
      nextViewportPage({ page: 1, received: 87, limit: 100, totalPages: 3 })
    ).toBe(2)
  })

  it("sin pages, sigue solo si el batch vino lleno", () => {
    expect(nextViewportPage({ page: 1, received: 100, limit: 100 })).toBe(2)
    expect(nextViewportPage({ page: 1, received: 40, limit: 100 })).toBeNull()
  })

  it("no pasa el techo de páginas", () => {
    expect(
      nextViewportPage({
        page: MAP_VIEWPORT_MAX_PAGES,
        received: 100,
        limit: 100,
        totalPages: 99,
      })
    ).toBeNull()
  })
})

describe("MapaPageClient viewport paging", () => {
  it("pide page y mergea; no pisa el cache con un write de 100", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "components/mapa/MapaPageClient.tsx"),
      "utf8"
    )
    expect(src).toContain("nextViewportPage")
    expect(src).toContain('params.append("page"')
    expect(src).toContain("networkFetchViewport")
    expect(src).toContain("lastBoundsRef")
    expect(src).not.toContain("writePlacesCache")
  })
})
