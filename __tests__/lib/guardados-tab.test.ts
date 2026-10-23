/**
 * @jest-environment node
 */
import fs from "fs"
import path from "path"
import { guardadosTabFromSearch, MIS_LISTAS_HREF } from "@/lib/lists/guardados-tab"

describe("guardadosTabFromSearch", () => {
  it("?tab=listas abre Mis listas; lo demás, Favoritos", () => {
    expect(guardadosTabFromSearch("?tab=listas")).toBe("listas")
    expect(guardadosTabFromSearch(new URL(`https://x${MIS_LISTAS_HREF}`).search)).toBe("listas")
    expect(guardadosTabFromSearch("")).toBe("favoritos")
    expect(guardadosTabFromSearch("?tab=otra")).toBe("favoritos")
  })
})

describe("/perfil: metadata y CeliBot", () => {
  const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8")

  it("título 'Mi perfil' (con la plantilla queda 'Mi perfil | CeliMap') y noindex", () => {
    const layout = read("app/perfil/layout.tsx")
    expect(layout).toContain('title: "Mi perfil"')
    expect(layout).toContain("robots: { index: false, follow: false }")
  })

  it("'Eliminar mi cuenta' no ocupa todo el ancho: a la derecha pasa el botón de CeliBot", () => {
    const section = read("components/delete-account-section.tsx")
    const button = section.slice(section.indexOf("<Button"), section.indexOf("Eliminar mi cuenta"))
    expect(button).not.toContain("w-full")
  })

  it("/favoritos lee la pestaña de la URL sin useSearchParams", () => {
    const page = read("app/favoritos/page.tsx")
    expect(page).toContain("guardadosTabFromSearch(window.location.search)")
    expect(page).not.toMatch(/import \{[^}]*useSearchParams/)
  })
})
