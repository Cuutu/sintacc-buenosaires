/**
 * @jest-environment node
 */
import fs from "fs"
import path from "path"

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8")

describe("/mapa: buscar un barrio muestra solo ese barrio (revisión 23/10)", () => {
  const src = read("components/mapa/MapaPageClient.tsx")

  it("la lista se arma solo con la clave del filtro, sin los barrios vecinos", () => {
    expect(src).toContain("setPlaces(mergeCachedPlaces([primaryKey]))")
    expect(src).not.toMatch(/applyMerged\([^)]*extraKeys/)
  })

  it("los vecinos se siguen precargando (para la próxima búsqueda)", () => {
    expect(src).toContain("getAdjacentNeighborhoods(effectiveNeighborhood)")
    expect(src).toContain("prefetchPlacesIfStale(key")
  })
})
