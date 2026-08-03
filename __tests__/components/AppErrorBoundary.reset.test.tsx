/**
 * @jest-environment node
 */
import fs from "fs"
import path from "path"

const root = path.join(__dirname, "../..")
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8")

describe("AppErrorBoundary + LayoutChrome contratos", () => {
  it("resetKey + componentDidUpdate; variant chrome para BottomNav", () => {
    const src = read("components/AppErrorBoundary.tsx")
    expect(src).toContain("resetKey?: string")
    expect(src).toContain("componentDidUpdate")
    expect(src).toContain("prevProps.resetKey !== this.props.resetKey")
    expect(src).toContain('variant?: "page" | "chrome"')
    expect(src).toContain('data-testid="bottom-nav-error-boundary"')
    expect(src).toContain('data-testid="app-error-boundary"')
  })

  it("LayoutChrome: resetKey sin key; BottomNav chrome estable", () => {
    const src = read("components/layout/LayoutChrome.tsx")
    expect(src).toContain("resetKey={routeKey}")
    expect(src).toContain('source="page-boundary"')
    expect(src).toContain('source="bottom-nav-boundary"')
    expect(src).toContain('variant="chrome"')
    expect(src).not.toMatch(/AppErrorBoundary\s+key=\{/)
    expect(src).toContain("bumpDiag(\"layoutChromeMounts\")")
  })

  it("BottomNav slots estables + resolveBottomNavPerfilHref", () => {
    const src = read("components/nav/BottomNav.tsx")
    expect(src).toContain("resolveBottomNavPerfilHref")
    expect(src).toContain("data-nav-slot")
    expect(src).toContain("BOTTOM_NAV_SLOT_KEYS")
  })

  it("único register SW en PwaRegister", () => {
    const files = [
      "components/pwa/PwaRegister.tsx",
      "components/ClientErrorListeners.tsx",
      "app/layout.tsx",
    ]
    let registers = 0
    for (const f of files) {
      const src = read(f)
      const m = src.match(/serviceWorker\.register/g)
      registers += m ? m.length : 0
    }
    expect(registers).toBe(1)
  })
})
