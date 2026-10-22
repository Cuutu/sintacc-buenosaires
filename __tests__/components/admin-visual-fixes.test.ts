/**
 * Errores visuales del admin (revisión del 21/10/2026). Tests de estructura:
 * leen el código para que no vuelvan.
 */
import { readFileSync } from "fs"
import path from "path"

const read = (rel: string) => readFileSync(path.join(__dirname, "../..", rel), "utf8")

describe("tabla de Lugares", () => {
  const src = read("components/admin/AdminPlacesSection.tsx")

  it("encabezado y filas usan la misma grilla, con la columna de acciones de ancho fijo", () => {
    const grid = src.match(/const PLACES_TABLE_GRID = "([^"]+)"/)?.[1]
    expect(grid).toBeDefined()
    expect(grid).not.toMatch(/_auto\]/)
    expect(grid).toMatch(/_\d+(\.\d+)?rem\]$/)
    // El encabezado y las filas la usan; nadie arma la grilla a mano.
    expect(src.match(/\$\{PLACES_TABLE_GRID\}/g)?.length).toBeGreaterThanOrEqual(2)
    expect(src).not.toMatch(/grid-cols-\[auto_minmax\(0,1\.6fr\)[^\]]*_auto\]/)
  })

  it("Editar y Ver tienen el mismo alto", () => {
    expect(src).toMatch(/className=\{ROW_ACTION\}[\s\S]*Editar/)
    expect(src).toMatch(/className=\{ROW_ACTION\}>\s*Ver/)
  })

  it("el menú ⋯ es un DropdownMenu (cierra con Escape y clic afuera)", () => {
    expect(src).toContain("DropdownMenuTrigger")
    expect(src).not.toContain("openMenu")
  })

  it("la ciudad sale con su nombre, no con el slug", () => {
    expect(src).toContain("formatLocalityName(place.locality)")
    expect(src).not.toMatch(/\{place\.locality \|\| place\.neighborhood/)
  })
})

describe("modales de edición", () => {
  it.each(["components/admin/PlaceEditModal.tsx", "components/admin/VentureEditModal.tsx"])(
    "%s no muestra la ✕ encima de Guardar",
    (file) => {
      expect(read(file)).toMatch(/<DialogContent hideClose/)
    }
  )

  it("las coordenadas se cargan redondeadas", () => {
    const src = read("components/admin/PlaceEditModal.tsx")
    expect(src).not.toMatch(/String\((loc|geo|r|result)\.(lat|lng)\)/)
    expect(src).toContain("formatCoordinate(loc.lat)")
  })
})

describe("reseñas", () => {
  it.each([
    "components/admin/AdminReviewsSection.tsx",
    "components/admin/AdminVentureReviewsSection.tsx",
    "components/lugar/PlaceCommunityReviews.tsx",
    "components/ventures/VentureReviewsSection.tsx",
  ])("%s muestra el comentario sin &quot;", (file) => {
    expect(read(file)).toMatch(/decodeStoredText\((review|r)\.comment\)/)
  })
})
