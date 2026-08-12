import { readFileSync } from "fs"
import path from "path"

const root = path.join(__dirname, "../..")

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8")
}

describe("Home stats copy + structure", () => {
  it("StatsRow usa bloque único premium (sin carrusel de cards)", () => {
    const src = read("components/home/StatsRow.tsx")
    expect(src).toContain('data-testid="home-stats"')
    expect(src).toContain("lugares en el mapa")
    expect(src).toContain("reseñas en Google")
    expect(src).toContain("Acumuladas por los lugares disponibles en CeliMap")
    expect(src).toContain("usuarios registrados")
    expect(src).toContain("reviewsCountGoogle")
    expect(src).toContain("floorDisplayCount")
    expect(src).not.toContain("reseñas de CeliMap y Google")
    expect(src).not.toContain("usuarios en la comunidad")
    expect(src).not.toContain("stats-carousel")
    expect(src).not.toContain("snap-x")
    expect(src).not.toContain("verificados")
    expect(src).not.toContain("activos")
  })

  it("pills home sin claims engañosos", () => {
    const src = read("app/page.tsx")
    expect(src).toContain("Lugares 100% sin gluten")
    expect(src).toContain("Opciones aptas")
    expect(src).toContain("Buenos Aires, Córdoba y más")
    expect(src).not.toContain("100% sin TACC verificados")
    expect(src).not.toContain("Sin reportes de contaminación")
    expect(src).not.toMatch(/Reseñas de la comunidad/)
  })
})
