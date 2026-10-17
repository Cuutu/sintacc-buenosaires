import fs from "fs"
import path from "path"
import {
  __resetAppLinksForTests,
  appLinkPath,
  createAppLinkHandler,
  isAppLinkPath,
} from "@/lib/native-app-links"
import { UNIVERSAL_LINK_PATHS } from "@/lib/apple-app-site-association"

const SERIAL = "0123456789abcdef0123456789abcdef"
const STAMP_URL = `https://www.celimap.com.ar/local/sellar/${SERIAL}`

describe("appLinkPath", () => {
  it("devuelve la ruta de los links de /local de celimap.com.ar", () => {
    expect(appLinkPath(STAMP_URL)).toBe(`/local/sellar/${SERIAL}`)
    expect(appLinkPath("https://celimap.com.ar/local")).toBe("/local")
    expect(appLinkPath("https://www.celimap.com.ar/local/escanear?x=1#y")).toBe("/local/escanear?x=1#y")
  })

  it("ignora otros sitios, otros caminos y el login de la app", () => {
    expect(appLinkPath("https://evil.com/local/sellar/x")).toBeNull()
    expect(appLinkPath("https://www.celimap.com.ar.evil.com/local")).toBeNull()
    expect(appLinkPath("http://www.celimap.com.ar/local")).toBeNull()
    expect(appLinkPath("https://user@www.celimap.com.ar/local")).toBeNull()
    expect(appLinkPath("https://www.celimap.com.ar/localidades")).toBeNull()
    expect(appLinkPath("https://www.celimap.com.ar/tarjeta/abc")).toBeNull()
    expect(appLinkPath("celimap://auth/handoff?code=abc")).toBeNull()
    expect(appLinkPath("")).toBeNull()
    expect(appLinkPath(undefined)).toBeNull()
  })

  it("coincide con lo que declaran iOS y Android", () => {
    expect(UNIVERSAL_LINK_PATHS).toEqual(["/local", "/local/*"])
    expect(isAppLinkPath("/local")).toBe(true)
    expect(isAppLinkPath("/local/x")).toBe(true)
    expect(isAppLinkPath("/locales")).toBe(false)
    const manifest = fs.readFileSync(
      path.join(process.cwd(), "android/app/src/main/AndroidManifest.xml"),
      "utf8"
    )
    expect(manifest).toContain('<data android:path="/local" />')
    expect(manifest).toContain('<data android:pathPrefix="/local/" />')
    expect(manifest).not.toContain('android:pathPrefix="/local"')
  })
})

describe("createAppLinkHandler", () => {
  beforeEach(() => __resetAppLinksForTests())

  function setup(currentHref = "https://www.celimap.com.ar/") {
    const assign = jest.fn()
    const handle = createAppLinkHandler({ assign, currentHref: () => currentHref })
    return { assign, handle }
  }

  it("lleva el WebView a la página del link", () => {
    const { assign, handle } = setup()
    expect(handle(STAMP_URL, "open")).toBe(true)
    expect(assign).toHaveBeenCalledWith(`/local/sellar/${SERIAL}`)
  })

  it("no hace nada con links que no son de la app", () => {
    const { assign, handle } = setup()
    expect(handle("https://www.celimap.com.ar/mapa", "open")).toBe(false)
    expect(handle("celimap://auth/handoff?code=abc", "launch")).toBe(false)
    expect(assign).not.toHaveBeenCalled()
  })

  it("si llegan los dos avisos al abrir la app, navega una sola vez", () => {
    const { assign, handle } = setup()
    handle(STAMP_URL, "open")
    handle(STAMP_URL, "launch")
    expect(assign).toHaveBeenCalledTimes(1)

    __resetAppLinksForTests()
    const other = setup()
    other.handle(STAMP_URL, "launch")
    other.handle(STAMP_URL, "open")
    expect(other.assign).toHaveBeenCalledTimes(1)
  })

  it("el link de arranque se usa una sola vez: después no vuelve a esa página", () => {
    const first = setup()
    first.handle(STAMP_URL, "launch")
    expect(first.assign).toHaveBeenCalledTimes(1)
    // Página nueva (otra carga del WebView): la app sigue devolviendo el mismo link de arranque.
    const later = setup("https://www.celimap.com.ar/local")
    expect(later.handle(STAMP_URL, "launch")).toBe(false)
    expect(later.assign).not.toHaveBeenCalled()
  })

  it("escanear la misma tarjeta otra vez la vuelve a abrir", () => {
    const first = setup()
    first.handle(STAMP_URL, "open")
    const later = setup(STAMP_URL)
    expect(later.handle(STAMP_URL, "open")).toBe(true)
    expect(later.assign).toHaveBeenCalledWith(`/local/sellar/${SERIAL}`)
  })

  it("si ya está en la página del link de arranque, no recarga", () => {
    const { assign, handle } = setup(STAMP_URL)
    expect(handle(STAMP_URL, "launch")).toBe(true)
    expect(assign).not.toHaveBeenCalled()
  })
})
