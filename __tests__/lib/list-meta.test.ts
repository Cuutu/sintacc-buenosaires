/**
 * @jest-environment node
 */
import fs from "fs"
import path from "path"
import { listPageTitle, listShareImage } from "@/lib/lists/list-meta"

const BASE = "https://www.celimap.com.ar"

describe("metadata del detalle de una lista", () => {
  it("título: nombre · Lista sin TACC (el template suma | CeliMap)", () => {
    expect(listPageTitle(" Lugares en Córdoba ")).toBe("Lugares en Córdoba · Lista sin TACC")
  })

  it("imagen: la portada; si no hay, la foto del primer lugar que tenga", () => {
    expect(listShareImage("https://res.cloudinary.com/x/portada.jpg", [{ photos: ["https://x/a.jpg"] }], BASE)).toBe(
      "https://res.cloudinary.com/x/portada.jpg"
    )
    expect(listShareImage(null, [{ photos: [] }, { photos: ["https://x/b.jpg"] }], BASE)).toBe("https://x/b.jpg")
    expect(listShareImage("", [{ photos: ["/uploads/c.jpg"] }], BASE)).toBe(`${BASE}/uploads/c.jpg`)
    expect(listShareImage(undefined, [null, { photos: null }], BASE)).toBeNull()
  })

  it("el layout usa el título, la imagen y cuenta solo los lugares publicados", () => {
    const src = fs.readFileSync(path.join(__dirname, "../../app/listas/[id]/layout.tsx"), "utf8")
    expect(src).toContain("listPageTitle(list.name)")
    expect(src).toContain("listShareImage(list.coverImage, places, baseUrl)")
    expect(src).toContain("match: LIST_VISIBLE_PLACES_MATCH")
  })

  it("Guardados: título propio y noindex", () => {
    const src = fs.readFileSync(path.join(__dirname, "../../app/favoritos/layout.tsx"), "utf8")
    expect(src).toContain('title: "Guardados"')
    expect(src).toContain("robots: { index: false, follow: false }")
  })
})
