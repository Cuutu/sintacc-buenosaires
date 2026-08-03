/**
 * @jest-environment node
 *
 * Contratos Lote 2 — safe areas. Valida clases/tokens en fuente, no valores simulados de env().
 */
import fs from "fs"
import path from "path"

const root = path.join(__dirname, "../..")

function read(rel: string) {
  return fs.readFileSync(path.join(root, rel), "utf8")
}

describe("Lote 2 safe-area policy contracts", () => {
  it("viewportFit cover en root layout", () => {
    const src = read("app/layout.tsx")
    expect(src).toMatch(/viewportFit:\s*["']cover["']/)
  })

  it("tokens globales definidos con env() y fallback 0px", () => {
    const css = read("app/globals.css")
    expect(css).toContain("--safe-area-top: env(safe-area-inset-top, 0px)")
    expect(css).toContain("--safe-area-bottom: env(safe-area-inset-bottom, 0px)")
    expect(css).toContain("--safe-area-left: env(safe-area-inset-left, 0px)")
    expect(css).toContain("--safe-area-right: env(safe-area-inset-right, 0px)")
    expect(css).toContain("--mobile-header-gap:")
    expect(css).toContain("--bottom-nav-height:")
    expect(css).toContain("--bottom-nav-clearance:")
  })

  it("MapTopBar consume safe-area token + gap; sin 1.1rem", () => {
    const src = read("components/map-view/MapTopBar.tsx")
    expect(src).toContain("var(--safe-area-top)")
    expect(src).toContain("var(--mobile-header-gap)")
    expect(src).not.toMatch(/1\.1rem/)
    expect(src).toContain("md:top-6")
  })

  it("BottomNav consume safe bottom + float gap", () => {
    const src = read("components/nav/BottomNav.tsx")
    expect(src).toContain("var(--safe-area-bottom)")
    expect(src).toContain("var(--bottom-nav-float-gap)")
    expect(src).toContain("h-16")
  })

  it("LayoutChrome reserva BottomNav clearance y no pt en mapa", () => {
    const src = read("components/layout/LayoutChrome.tsx")
    expect(src).toContain("pb-[var(--bottom-nav-clearance)]")
    expect(src).toContain("pt-[var(--safe-area-top)]")
    expect(src).toContain("!isMapRoute")
  })

  it("no queda offset mágico 1.1rem en componentes UI", () => {
    const files = [
      "components/map-view/MapTopBar.tsx",
      "components/map-view/MapMobile.tsx",
      "components/layout/LayoutChrome.tsx",
      "components/nav/BottomNav.tsx",
      "app/page.tsx",
    ]
    for (const f of files) {
      expect(read(f)).not.toMatch(/1\.1rem/)
    }
  })

  it("NativeStatusBar usa overlay true (edge-to-edge)", () => {
    const src = read("components/native/NativeStatusBar.tsx")
    expect(src).toContain("overlay: true")
    expect(src).toContain("setOverlaysWebView({ overlay: true })")
  })

  it("capacitor StatusBar overlaysWebView true", () => {
    const src = read("capacitor.config.ts")
    expect(src).toMatch(/overlaysWebView:\s*true/)
  })

  it("mapa layout usa clearance token para full-bleed", () => {
    const src = read("app/mapa/layout.tsx")
    expect(src).toContain("-mb-[var(--bottom-nav-clearance)]")
    expect(src).toContain("100dvh")
  })
})
