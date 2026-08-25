import { readFileSync } from "fs"
import path from "path"

const root = path.join(__dirname, "../..")

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8")
}

describe("Home landing v3 copy + structure", () => {
  it("HeroMetrics es una línea compacta con 3 métricas", () => {
    const src = read("components/home/HeroMetrics.tsx")
    expect(src).toContain('data-testid="home-stats"')
    expect(src).toContain("lugares")
    expect(src).toContain("reseñas")
    expect(src).toContain("usuarios")
    expect(src).toContain("reviewsCountGoogle")
    expect(src).toContain("floorDisplayCount")
    expect(src).toContain("initialStats")
    expect(src).not.toContain("reseñas de CeliMap y Google")
    expect(src).toContain("stats-carousel")
    expect(src).not.toContain("snap-x")
    expect(src).not.toContain("verificados")
    expect(src).not.toContain("activos")
  })

  it("home tiene 5 bloques y no secciones viejas", () => {
    const src = read("app/page.tsx")
    expect(src).toContain("Encontrá lugares sin gluten")
    expect(src).toContain("Restaurantes, cafeterías y panaderías recomendados por la comunidad celíaca")
    expect(src).toContain("CategoryChips")
    expect(src).toContain("HeroMetrics")
    expect(src).toContain("HomeFeatured")
    expect(src).toContain("HowItWorks")
    expect(src).toContain("CommunityBand")
    expect(src).toContain("FaqSection")
    expect(src).toContain("TakeCeliMapWithYou")
    expect(src).not.toContain("EmprendimientosSection")
    expect(src).not.toContain("FeaturedListsSection")
    expect(src).not.toContain("Lugares sin gluten por ciudad")
    expect(src).not.toContain("Qué estás buscando")
    expect(src).not.toContain("tu mapa sin gluten")
    expect(src).not.toContain("Lugares verificados por la comunidad")
    expect(src).not.toContain("Verificá el nivel de seguridad")
  })

  it("cómo funciona usa 3 pasos numerados", () => {
    const src = read("components/home/HowItWorks.tsx")
    expect(src).toContain("Abrí el mapa")
    expect(src).toContain("Revisá el nivel de seguridad")
    expect(src).toContain("Leé y confirmá")
    expect(src).toContain("01")
    expect(src).toContain("02")
    expect(src).toContain("03")
    expect(src).not.toContain("Verificá el nivel de seguridad")
  })
})
