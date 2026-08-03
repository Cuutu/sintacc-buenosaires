/**
 * @jest-environment node
 */
import { isAllowedAvatarUrl } from "@/lib/avatar-url"
import { resolveBottomNavPerfilHref } from "@/lib/bottom-nav-perfil"
import {
  isCelimapServiceWorkerScript,
  isCelimapPwaCacheName,
  cleanupFlagKey,
} from "@/lib/native-sw-cleanup"
import fs from "fs"
import path from "path"

const root = path.join(__dirname, "../..")
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8")

describe("avatar-url", () => {
  it("acepta hosts configurados https", () => {
    expect(isAllowedAvatarUrl("https://lh3.googleusercontent.com/a/x")).toBe(true)
    expect(isAllowedAvatarUrl("https://res.cloudinary.com/demo/image/upload/v1/a.jpg")).toBe(true)
  })
  it("rechaza hostname desconocido, malformada, vacía, http", () => {
    expect(isAllowedAvatarUrl("https://evil.example/a.png")).toBe(false)
    expect(isAllowedAvatarUrl("not-a-url")).toBe(false)
    expect(isAllowedAvatarUrl("")).toBe(false)
    expect(isAllowedAvatarUrl(null)).toBe(false)
    expect(isAllowedAvatarUrl("http://lh3.googleusercontent.com/a")).toBe(false)
  })
})

describe("BottomNav perfil href", () => {
  it("loading y auth → /perfil; unauth → /login", () => {
    expect(resolveBottomNavPerfilHref("loading")).toBe("/perfil")
    expect(resolveBottomNavPerfilHref("authenticated")).toBe("/perfil")
    expect(resolveBottomNavPerfilHref("unauthenticated")).toBe("/login")
  })
})

describe("native SW helpers + contratos", () => {
  it("reconoce SW/caches Celimap", () => {
    expect(isCelimapServiceWorkerScript("https://www.celimap.com.ar/sw.js")).toBe(true)
    expect(isCelimapServiceWorkerScript("https://evil.example/sw.js")).toBe(false)
    expect(isCelimapPwaCacheName("workbox-precache-v2-x")).toBe(true)
    expect(isCelimapPwaCacheName("user-favorites-db")).toBe(false)
  })

  it("flag namespaced por versión", () => {
    expect(cleanupFlagKey().startsWith("celimap_native_sw_cleanup:")).toBe(true)
  })

  it("PwaRegister: register false path + update banner + native cleanup", () => {
    const src = read("components/pwa/PwaRegister.tsx")
    expect(src).toContain("resolveRuntimeShell")
    expect(src).toContain("cleanupNativeCelimapServiceWorkers")
    expect(src).toContain('register("/sw.js"')
    expect(src).toContain("SKIP_WAITING")
    expect(src).toContain("sw-update-banner")
    expect(src).toContain("shouldReload")
    const cfg = read("next.config.js")
    expect(cfg).toContain("register: false")
    expect(cfg).not.toMatch(/handler:\s*["']NetworkOnly["']/)
  })

  it("cleanup no toca cookies/IDB", () => {
    const cleanup = read("lib/native-sw-cleanup.ts")
    expect(cleanup).not.toContain("indexedDB.deleteDatabase")
    expect(cleanup).not.toContain("document.cookie")
    expect(cleanup).toContain('"reloading"')
    expect(cleanup).toContain('"done"')
  })
})
