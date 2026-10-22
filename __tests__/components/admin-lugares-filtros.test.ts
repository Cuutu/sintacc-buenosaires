/**
 * @jest-environment node
 */
import { readFileSync } from "fs"
import path from "path"

const read = (rel: string) => readFileSync(path.join(__dirname, "../..", rel), "utf8")

describe("Lugares: filtros", () => {
  const src = read("components/admin/AdminPlacesSection.tsx")

  it("estado en pestañas con contador (Todos · Publicados · Pendientes)", () => {
    expect(src).toContain('ariaLabel="Estado de los lugares"')
    expect(src).toMatch(/label: "Todos", count: counts\?\.placesTotal/)
    expect(src).toMatch(/label: "Publicados", count: counts\?\.placesApproved/)
    expect(src).toContain('label: "Pendientes"')
  })

  it("lo que falta va en un solo desplegable con cantidades, no en 10 chips sueltos", () => {
    expect(src).toContain('"Falta…"')
    expect(src).toContain("missingFilters.map")
    for (const label of ["Sin foto", "Sin horarios", "Sin teléfono", "Sin web", "Sin coordenadas", "Ficha incompleta"]) {
      expect(src).toContain(`label: "${label}"`)
    }
    // Ya no está la pastilla fija "País: Argentina".
    expect(src).not.toContain("País: Argentina")
  })

  it("sin foto, el avatar lleva ícono y color de la categoría", () => {
    expect(src).toContain("function PlaceAvatar")
    expect(src).toContain("getCategoryIcon(place.type)")
    expect(src).not.toContain("place.name.slice(0, 2).toUpperCase()")
  })

  it("los filtros piden la lista con el estado nuevo (antes se aplicaban un clic tarde)", () => {
    const dash = read("components/admin/AdminDashboard.tsx")
    expect(dash).toContain("fetchPlacesRef.current = fetchPlaces")
    expect(dash).toContain("fetchPlaces={fetchPlacesLatest}")
    expect(dash).toContain("counts={counts}")
  })
})
