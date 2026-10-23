/**
 * @jest-environment node
 */
import fs from "fs"
import path from "path"

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8")

describe("SEO, revisión 23/10", () => {
  it("/lista redirige 301 a /listas (también con id)", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const config = require("../../../next.config.js")
    const redirects: Array<{ source: string; destination: string; permanent: boolean }> = await config.redirects()
    expect(redirects).toEqual(
      expect.arrayContaining([
        { source: "/lista", destination: "/listas", permanent: true },
        { source: "/lista/:id", destination: "/listas/:id", permanent: true },
      ])
    )
  })

  it("/listas sin doble espacio y con la plantilla para el detalle de lista", () => {
    const src = read("app/listas/layout.tsx")
    expect(src).toContain('title: { default: "Listas de lugares sin gluten", template: "%s | CeliMap" }')
    expect(src).not.toMatch(/sin gluten "/)
  })

  it("/local/* (escanear, sellar, cartel) lleva \"| CeliMap\"", () => {
    expect(read("app/local/layout.tsx")).toContain('template: "%s | CeliMap"')
  })

  it("/sugerir y /sugerir-emprendimiento: el h1 sale del layout (servidor)", () => {
    expect(read("app/sugerir/layout.tsx")).toContain("<SuggestPageShell")
    expect(read("app/sugerir-emprendimiento/layout.tsx")).toContain("<SuggestPageShell")
    expect(read("components/forms/SuggestPageShell.tsx")).not.toContain('"use client"')
    expect(read("components/forms/SuggestPageShell.tsx")).toContain("<h1")
    // El formulario ya no tiene h1 propio ni el "Volver al mapa".
    expect(read("app/sugerir/page.tsx")).not.toContain("<h1")
    expect(read("app/sugerir/page.tsx")).not.toContain("Volver al mapa")
    expect(read("app/sugerir-emprendimiento/SugerirEmprendimientoContent.tsx")).not.toContain("<h1")
  })

  it("/privacidad: diseño editorial y la URL del sitio según el entorno", () => {
    const src = read("app/privacidad/page.tsx")
    expect(src).toContain("<EditorialArticle")
    expect(src).toContain("getBaseUrl()")
    expect(src).not.toContain("prueba.celimap")
  })
})
