/**
 * @jest-environment node
 */
import fs from "fs"
import path from "path"

const root = path.join(__dirname, "../..")
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8")

describe("footer CeliMap", () => {
  it("fondo oliva profundo, patrón de espigas y franja terracota antes del pie", () => {
    const src = read("components/footer.tsx")
    expect(src).toContain("#234A33")
    expect(src).toContain("texture-wheat-watermark.svg")
    expect(src).toContain("opacity-[0.09]")
    expect(src).toContain("<FooterCta />")
    // Reserva la barra de abajo y el botón de CeliBot (así no tapa "Aviso legal").
    expect(src).toContain("pb-[calc(var(--bottom-nav-clearance)+4.5rem)] md:pb-0")
    // Mismo ancho que la barra de arriba.
    expect(src).toContain("max-w-5xl")

    const cta = read("components/footer-cta.tsx")
    expect(cta).toContain("¿Conocés un lugar sin gluten?")
    expect(cta).toContain("Sugerir un lugar")
    expect(cta).toContain("bg-[#B84420]")
    expect(cta).toContain("md:flex-row")
    expect(cta).toContain("PlusCircle")
  })

  it("la franja no se repite donde ya hay un llamado a sugerir", () => {
    const cta = read("components/footer-cta.tsx")
    expect(cta).toContain('"/", "/sugerir", "/sugerir-emprendimiento"')
    expect(cta).toContain("usePathname")
  })

  it("mobile usa acordeón; desktop columnas editoriales", () => {
    const src = read("components/footer.tsx")
    expect(src).toContain("<details")
    expect(src).toContain("md:hidden")
    expect(src).toContain("minmax(0,0.45fr)")
    expect(src).toContain("Explorar")
    expect(src).toContain("Información")
  })

  it("aparece en mobile fuera del mapa", () => {
    const chrome = read("components/layout/LayoutChrome.tsx")
    expect(chrome).toContain("!hidePublicChrome && !isMapRoute && <Footer />")
    expect(chrome).not.toContain("showDesktopChrome && <Footer />")
  })

  it("navbar no espera useIsMobile para montar links", () => {
    const chrome = read("components/layout/LayoutChrome.tsx")
    const nav = read("components/navbar.tsx")
    expect(chrome).toContain("{!hidePublicChrome && <Navbar />}")
    expect(chrome).not.toContain("showDesktopChrome && <Navbar />")
    expect(nav).toContain("hidden min-[769px]:block")
    expect(nav).toContain('href: "/emprendimientos"')
    expect(nav).toContain('href: "/listas"')
  })
})
