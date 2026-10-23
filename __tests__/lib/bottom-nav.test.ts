/**
 * @jest-environment node
 */
import fs from "fs"
import path from "path"
import { BOTTOM_NAV_SLOT_KEYS, isBottomNavItemActive } from "@/lib/bottom-nav-perfil"

describe("barra de abajo fija (revisión 23/10)", () => {
  it("siempre los mismos cinco, en este orden", () => {
    expect([...BOTTOM_NAV_SLOT_KEYS]).toEqual(["inicio", "mapa", "favoritos", "emprendimientos", "perfil"])
  })

  it("marca la pestaña de la página actual (y solo esa)", () => {
    const active = (pathname: string) => BOTTOM_NAV_SLOT_KEYS.filter((slot) => isBottomNavItemActive(slot, pathname))
    expect(active("/")).toEqual(["inicio"])
    expect(active("/mapa")).toEqual(["mapa"])
    expect(active("/listas/123")).toEqual(["favoritos"])
    expect(active("/emprendimientos/celi-bakery")).toEqual(["emprendimientos"])
    expect(active("/perfil")).toEqual(["perfil"])
    expect(active("/lugar/x")).toEqual([])
  })

  it("en el mapa 'Mapa' ya no se convierte en 'Inicio'", () => {
    const src = fs.readFileSync(path.join(process.cwd(), "components/nav/BottomNav.tsx"), "utf8")
    expect(src).not.toContain("isOnMap")
    expect(src).not.toContain("isListToggle")
  })
})
