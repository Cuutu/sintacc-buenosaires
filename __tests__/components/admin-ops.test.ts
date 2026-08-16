/**
 * @jest-environment node
 */
import fs from "fs"
import path from "path"

const root = path.join(__dirname, "../..")
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8")

describe("admin centro de operaciones", () => {
  it("sidebar fija con secciones y contadores", () => {
    const nav = read("components/admin/ops/admin-nav.ts")
    const shell = read("components/admin/ops/AdminOpsShell.tsx")
    expect(nav).toContain("Dashboard")
    expect(nav).toContain("Lugares")
    expect(nav).toContain("Marcas")
    expect(nav).toContain("Mensajes")
    expect(shell).toContain("w-[240px]")
    expect(nav).toContain("suggestionsPending")
    expect(shell).toContain("⌘K")
    expect(shell).toContain("#F8F5EF")
    expect(shell).not.toContain("#0B0B0D")
    expect(shell).toContain('href="/"')
    expect(shell).toContain("Volver a CeliMap")
  })

  it("dashboard es inbox, no grilla de botones", () => {
    const dash = read("components/admin/ops/OpsDashboard.tsx")
    expect(dash).toContain("Centro de operaciones")
    expect(dash).toContain("Todo lo que necesitás para mantener CeliMap completo, actualizado y útil.")
    expect(dash).toContain("Calidad CeliMap")
    expect(dash).toContain("Necesita atención")
    expect(dash).toContain("Qué debería resolver primero")
    expect(read("lib/admin-ops.ts")).toContain("Lugares por revisar")
    expect(dash).toContain("Ver lugares")
    expect(dash).toContain("Actividad reciente")
    expect(dash).toContain("#234A33")
    expect(read("lib/admin-ui.ts")).toContain("#F8F5EF")
  })

  it("lugares es CRM con completitud y modal por tabs", () => {
    const places = read("components/admin/AdminPlacesSection.tsx")
    const modal = read("components/admin/PlaceEditModal.tsx")
    expect(places).toContain("Completitud")
    expect(places).toContain("PlaceCompleteness")
    expect(places).toContain("Sin teléfono")
    expect(places).toContain("Ficha incompleta")
    expect(places).toContain("Despublicar")
    expect(places).toContain("Más recientes")
    expect(places).toContain("Última edición")
    expect(places).toContain("Duplicar")
    expect(places).toContain("Buscar por nombre, dirección, barrio o ciudad.")
    expect(modal).toContain("General")
    expect(modal).toContain("Ubicación")
    expect(modal).toContain("Calidad de la ficha")
    expect(modal).toContain("Ver ficha pública")
    expect(modal).toContain("Operación")
    expect(modal).toContain("SEO")
  })

  it("preview bypass está apagado y admin exige sesión real", () => {
    const flag = read("lib/admin-preview.ts")
    const requireAdmin = read("lib/middleware.ts")
    const mw = read("middleware.ts")
    const layout = read("app/admin/layout.tsx")
    const navbar = read("components/navbar.tsx")
    const bottom = read("components/nav/BottomNav.tsx")
    expect(flag).toContain("ADMIN_OPEN_FOR_PREVIEW = false")
    expect(requireAdmin).not.toContain("Preview")
    expect(requireAdmin).not.toContain("ADMIN_OPEN_FOR_PREVIEW")
    expect(mw).toContain('pathname.startsWith("/admin")')
    expect(mw).not.toContain("ADMIN_OPEN_FOR_PREVIEW")
    expect(layout).toContain('session.user.role !== "admin"')
    expect(layout).toContain('export const dynamic = "force-dynamic"')
    expect(layout).not.toContain("ADMIN_OPEN_FOR_PREVIEW")
    expect(navbar).not.toContain("ADMIN_OPEN_FOR_PREVIEW")
    expect(navbar).toContain('session.user.role === "admin"')
    expect(bottom).not.toContain("ADMIN_OPEN_FOR_PREVIEW")
    expect(bottom).toContain('session?.user?.role === "admin"')
    expect(read("app/api/auth/native/apple/challenge/route.ts")).toContain(
      'export const dynamic = "force-dynamic"'
    )
  })

  it("admin no muestra chrome público", () => {
    const chrome = read("components/layout/LayoutChrome.tsx")
    expect(chrome).toContain("isAdminRoute")
    expect(chrome).toContain("hidePublicChrome")
  })
})
