/**
 * @jest-environment node
 */
import fs from "fs"
import path from "path"

const root = path.join(__dirname, "../..")
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8")

describe("Llevá CeliMap con vos", () => {
  it("franja usa las fichas reales de App Store y Play Store, sin PWA", () => {
    const src = read("components/home/TakeCeliMapWithYou.tsx")
    expect(src).toContain("Llevá CeliMap con vos")
    expect(src).toContain("El mapa sin gluten, siempre a mano.")
    expect(src).toContain("CELIMAP_APP_STORE_URL")
    expect(src).toContain("CELIMAP_PLAY_STORE_URL")
    expect(src).toContain('store="ios"')
    expect(src).toContain('store="android"')
    expect(src).toContain("data-store-badge={store}")
    expect(src).toContain("data-get-app")
    expect(src).not.toContain("promptPwaInstall")
    expect(src).not.toContain("Próximamente")
    expect(src).toContain("isStandaloneDisplay")
  })

  it("franja se renderiza en el servidor (sin salto de layout) y CSS elige el badge", () => {
    const src = read("components/home/TakeCeliMapWithYou.tsx")
    const css = read("app/globals.css")
    const layout = read("app/layout.tsx")
    expect(src).toContain("useState(false)")
    expect(src).not.toContain("getDevicePlatform")
    expect(css).toContain('html[data-device="android"] [data-store-badge="ios"]')
    expect(css).toContain('html[data-device="ios"] [data-store-badge="android"]')
    expect(css).toContain("html[data-app-shell] [data-get-app]")
    expect(layout).toContain("DEVICE_HINT_SCRIPT")
    expect(layout).toContain("suppressHydrationWarning")
  })

  it("home la muestra arriba de Lugares destacados", () => {
    const page = read("app/page.tsx")
    expect(page.indexOf("<TakeCeliMapWithYou />")).toBeGreaterThan(-1)
    expect(page.indexOf("<TakeCeliMapWithYou />")).toBeLessThan(page.indexOf("<HomeFeatured"))
  })

  it("InstallPrompt no se abre solo al cargar", () => {
    const src = read("components/pwa/InstallPrompt.tsx")
    expect(src).toContain("INSTALL_REQUEST_EVENT")
    expect(src).toContain("Descargá CeliMap")
    expect(src).toContain("Instalá CeliMap")
    expect(src).toContain("CELIMAP_PLAY_STORE_URL")
    expect(src).not.toContain("Próximamente")
    expect(src).not.toContain("setTimeout(() => setOpen(true)")
    expect(src).toContain("useBottomPrompt")
    expect(src).toContain('bottomPrompt === "store"')
    expect(src).toContain("suppressForStoreBanner")
    expect(src).not.toContain("Acceso rápido desde tu pantalla de inicio")
  })

  it("PreviewBadge no aparece en celimap.com.ar", () => {
    const src = read("components/native/PreviewBadge.tsx")
    expect(src).toContain("www.celimap.com.ar")
    expect(src).toContain("isProdHost")
    expect(src).toContain("isPreviewEnv")
  })

  it("banner store no sale en el primer load de home", () => {
    const banner = read("components/store-banner/StoreAppBanner.tsx")
    const mapa = read("components/mapa/MapaPageClient.tsx")
    expect(banner).toContain("shouldShowStoreBanner")
    expect(banner).toContain("unlockStoreBanner")
    expect(mapa).toContain("unlockStoreBanner")
    expect(mapa).toContain("selectedPlaceId")
  })
})
