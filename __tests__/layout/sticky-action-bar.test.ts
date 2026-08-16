/**
 * @jest-environment node
 */
import fs from "fs"
import path from "path"

const root = path.join(__dirname, "../..")
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8")

describe("ficha lugar — BottomNav sin barra Ir", () => {
  it("LayoutChrome muestra BottomNav en todo mobile (incluye /lugar)", () => {
    const src = read("components/layout/LayoutChrome.tsx")
    expect(src).toContain("showMobileChrome && (")
    expect(src).toContain("<BottomNav />")
    expect(src).not.toMatch(/lugar.*BottomNav|BottomNav.*lugar/)
  })

  it("ficha lugar no usa barra flotante Ir", () => {
    const page = read("app/lugar/[id]/page.tsx")
    expect(page).not.toContain("StickyActionBarMobile")
    expect(page).not.toMatch(/>\s*Ir\s*</)
    expect(fs.existsSync(path.join(root, "components/lugar/StickyActionBarMobile.tsx"))).toBe(
      false
    )
  })

  it("clearance de ficha ya no suma altura de sticky Ir", () => {
    const css = read("app/globals.css")
    expect(css).toContain("--lugar-bottom-clearance")
    expect(css).not.toContain("--sticky-action-bar-height")
  })
})
