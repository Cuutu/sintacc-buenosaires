/**
 * @jest-environment node
 */
import fs from "fs"
import path from "path"

const root = path.join(__dirname, "../..")
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8")

describe("Llevá CeliMap con vos", () => {
  it("sección usa App Store real y no inventa Play Store", () => {
    const src = read("components/home/TakeCeliMapWithYou.tsx")
    expect(src).toContain("Llevá CeliMap con vos")
    expect(src).toContain("El mapa sin gluten, siempre a mano.")
    expect(src).toContain("CELIMAP_APP_STORE_URL")
    expect(src).toContain("Descargar en App Store")
    expect(src).not.toContain("En mi iPhone")
    expect(src).toContain("Instalar CeliMap")
    expect(src).toContain("Próximamente")
    expect(src).toContain('platform === "ios"')
    expect(src).toContain('platform === "android"')
    expect(src).not.toContain("play.google.com")
    expect(src).toContain("isStandaloneDisplay")
  })

  it("InstallPrompt no se abre solo al cargar", () => {
    const src = read("components/pwa/InstallPrompt.tsx")
    expect(src).toContain("INSTALL_REQUEST_EVENT")
    expect(src).toContain("Descargá CeliMap")
    expect(src).toContain("Instalá CeliMap")
    expect(src).not.toContain("setTimeout(() => setOpen(true)")
    expect(src).not.toContain("Acceso rápido desde tu pantalla de inicio")
  })

  it("PreviewBadge no aparece en celimap.com.ar", () => {
    const src = read("components/native/PreviewBadge.tsx")
    expect(src).toContain("www.celimap.com.ar")
    expect(src).toContain("isProdHost")
    expect(src).toContain("isPreviewEnv")
  })
})
