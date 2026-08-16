/**
 * @jest-environment node
 */
import fs from "fs"
import path from "path"

const root = path.join(__dirname, "../..")
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8")

describe("catálogo /emprendimientos", () => {
  it("hero compacto centrado en emprendimientos, no landing informativa", () => {
    const src = read("app/emprendimientos/EmprendimientosPageContent.tsx")
    expect(src).toContain("Descubrí")
    expect(src).toContain("emprendimientos")
    expect(src).toContain("sin gluten")
    expect(src).toContain("h-14")
    expect(src).toContain("Buscar viandas, panificados, pastelería o una ciudad")
    expect(src).not.toContain("VenturesExplainer")
    expect(src).not.toContain("Una sección para emprendimientos que no siempre tienen local")
  })

  it("cards editoriales con overlay y Ver perfil", () => {
    const src = read("components/ventures/VentureCard.tsx")
    expect(src).toContain("100% sin gluten")
    expect(src).toContain("#F8F5EF")
    expect(src).toContain("rounded-[24px]")
    expect(src).toContain("Ver perfil")
    expect(src).toContain("ventureInitials(")
    expect(src).toContain("h-full")
    expect(src).toContain("mt-auto")
    expect(src).not.toContain("placeholderWash")
  })

  it("destacadas y grid 4 columnas", () => {
    const rail = read("components/ventures/VentureFeaturedRail.tsx")
    const page = read("app/emprendimientos/EmprendimientosPageContent.tsx")
    expect(rail).toContain("Emprendimientos destacados")
    expect(rail).toContain("photos?.[0]")
    expect(rail).toContain("slice(0, max)")
    expect(page).toContain("xl:grid-cols-4")
    expect(read("components/ventures/VentureExploreSections.tsx")).toContain(
      "Publicar emprendimiento"
    )
  })
})
