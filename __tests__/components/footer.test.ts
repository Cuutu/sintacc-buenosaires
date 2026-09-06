/**
 * @jest-environment node
 */
import fs from "fs"
import path from "path"

const root = path.join(__dirname, "../..")
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8")

describe("footer CeliMap", () => {
  it("fondo oliva profundo, patrón de espigas y CTA crema", () => {
    const src = read("components/footer.tsx")
    expect(src).toContain("#234A33")
    expect(src).toContain("texture-wheat-watermark.svg")
    expect(src).toContain("opacity-[0.09]")
    expect(src).toContain("¿Conocés un lugar sin gluten?")
    expect(src).toContain("Sugerir un lugar")
    expect(src).toContain("#FDFBF7")
    expect(src).toContain("md:flex-row")
    expect(src).toContain("PlusCircle")
    expect(src).toContain("pb-[var(--bottom-nav-clearance)]")
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
