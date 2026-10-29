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

  it("home tiene bloques actuales y no secciones viejas", () => {
    const src = read("app/page.tsx")
    const directory = read("components/home/HomeDirectoryLinks.tsx")
    expect(src).toContain("Encontrá lugares sin gluten")
    expect(src).toContain("Restaurantes, cafeterías y panaderías recomendados por la comunidad celíaca")
    // Revisión 20/10: los chips de categorías se repetían con "Por tipo de lugar".
    expect(src).not.toContain("<CategoryChips")
    expect(src).not.toContain("<HomeSuggestBand")
    expect(src).not.toContain("HeroMetrics")
    expect(src).not.toContain('data-testid="home-stats"')
    expect(src).toContain("HomeFeatured")
    expect(src).toContain("HomeDirectoryLinks")
    expect(src).toContain("HowItWorks")
    expect(src).toContain("CommunityBand")
    expect(src).toContain("FaqSection")
    expect(src).toContain("TakeCeliMapWithYou")
    // Revisión 20/10: buscar es la acción principal. Revisión 29/10: el mapa es un botón
    // a la altura del buscador, antes de los chips. Revisión 30/10: abajo del buscador en
    // todos los tamaños (al lado le sacaba ancho), en la columna del párrafo (560 px).
    expect(src.indexOf("<SearchBar")).toBeGreaterThan(-1)
    expect(src.indexOf("<SearchBar")).toBeLessThan(src.indexOf('data-testid="home-open-map"'))
    expect(src.indexOf('data-testid="home-open-map"')).toBeLessThan(src.indexOf("<NearMeButton />"))
    expect(src).toContain("className={homeBtn.heroMap}")
    // Con \s+ y no con saltos de línea literales: en Windows el repo baja con CRLF.
    expect(src).toMatch(/<div className="mt-6 max-w-\[560px\]">\s+<div className="flex flex-col gap-3">\s+<SearchBar \/>/)
    const ui = read("components/home/home-ui.ts")
    // Crema sólido con texto verde: con verde transparente se confundía con los chips.
    expect(ui).toMatch(/heroMap:\s+"[^"]*bg-\[#F7F3EB\][^"]*text-\[#2D4A34\]/)
    expect(src).toContain("Explorar el mapa")
    expect(src).not.toContain("o abrí el mapa")
    // El mapa de fondo también abre /mapa, como atajo fuera del Tab y del lector.
    expect(src).toMatch(/<Link\s+href="\/mapa"\s+aria-hidden\s+tabIndex=\{-1\}\s+data-hero-map-shortcut/)
    const pins = read("components/home/HeroPins.tsx")
    expect(pins).toMatch(/<Link\s+href="\/mapa"\s+aria-hidden\s+tabIndex=\{-1\}/)
    expect(src).toContain("<NearMeButton />")
    // Cómo funciona va antes que explorar (explica 100% vs. opciones).
    expect(src.indexOf("<HowItWorks />")).toBeLessThan(src.indexOf("<HomeDirectoryLinks"))
    expect(src).toContain('data-testid="home-open-map"')
    expect(src).toContain("max-md:sr-only")
    expect(directory).toContain("`/${c.slug}-sin-gluten`")
    expect(directory).toContain("`/sin-gluten/${city.slug}`")
    expect(directory).toContain("getTop10CitySlugs")
    expect(src).toContain("EmprendimientosSection")
    expect(src).not.toContain("FeaturedListsSection")
    expect(src).not.toContain("Lugares sin gluten por ciudad")
    expect(src).not.toContain("Qué estás buscando")
    expect(src).not.toContain("tu mapa sin gluten")
    expect(src).not.toContain("Lugares verificados por la comunidad")
    expect(src).not.toContain("Verificá el nivel de seguridad")
  })

  it("modal de bienvenida usa /api/stats, no +400 hardcode", () => {
    const src = read("components/onboarding/OnboardingModal.tsx")
    expect(src).toContain("/api/stats")
    expect(src).toContain("formatPlacesInArgentinaLine")
    expect(src).not.toContain("+400")
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
