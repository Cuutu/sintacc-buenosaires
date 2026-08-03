/**
 * @jest-environment node
 */
import fs from "fs"
import path from "path"

const root = path.join(__dirname, "../..")
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8")

describe("StickyActionBar + BottomNav clearance contract", () => {
  it("StickyActionBar se posiciona con bottom-nav-clearance una sola vez", () => {
    const src = read("components/lugar/StickyActionBarMobile.tsx")
    expect(src).toContain("bottom-[var(--bottom-nav-clearance)]")
    // No re-aplica safe-area-bottom aparte (evitar doble inset)
    expect(src).not.toMatch(/safe-area-inset-bottom/)
    expect(src).not.toMatch(/--safe-area-bottom/)
    // Una sola referencia a clearance en el positioning
    const matches = src.match(/bottom-nav-clearance/g) || []
    expect(matches.length).toBe(1)
  })

  it("LayoutChrome muestra BottomNav en todo mobile (incluye /lugar)", () => {
    const src = read("components/layout/LayoutChrome.tsx")
    expect(src).toContain("showMobileChrome && (")
    expect(src).toContain("<BottomNav />")
    // No hay early-return que oculte BottomNav en /lugar
    expect(src).not.toMatch(/lugar.*BottomNav|BottomNav.*lugar/)
  })

  it("ficha lugar reserva clearance + altura sticky (no solo pb-24 mágico)", () => {
    const page = read("app/lugar/[id]/page.tsx")
    const css = read("app/globals.css")
    expect(css).toContain("--sticky-action-bar-height")
    expect(css).toContain("--lugar-bottom-clearance")
    expect(page).toContain("pb-[var(--lugar-bottom-clearance)]")
    expect(page).not.toMatch(/pb-24/)
  })
})
