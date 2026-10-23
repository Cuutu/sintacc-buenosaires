/**
 * @jest-environment node
 */
import { avatarAtSize, isAllowedAvatarUrl } from "@/lib/avatar-url"
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
    expect(isAllowedAvatarUrl("https://img.celimap.com.ar/v1/celimap/a.jpg")).toBe(true)
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
    // Ninguna regla runtime sobre /_next/static (los chunks los cachea el navegador).
    expect(cfg).not.toMatch(/urlPattern:[^\n]*_next\\?\/static/)
    // El único NetworkOnly es el de navegaciones, que usa el navigation preload.
    expect(cfg.match(/handler:\s*["']NetworkOnly["']/g) ?? []).toHaveLength(1)
    expect(cfg).toMatch(/urlPattern: \(\{ request \}\) => request\.mode === "navigate",\s*handler: "NetworkOnly"/)
    expect(cfg).toContain("navigationPreload: true")
  })

  it("cleanup no toca cookies/IDB", () => {
    const cleanup = read("lib/native-sw-cleanup.ts")
    expect(cleanup).not.toContain("indexedDB.deleteDatabase")
    expect(cleanup).not.toContain("document.cookie")
    expect(cleanup).toContain('"reloading"')
    expect(cleanup).toContain('"done"')
  })
})

describe("avatarAtSize", () => {
  it("pide la foto de Google al tamaño justo", () => {
    expect(avatarAtSize("https://lh3.googleusercontent.com/a/ACg8oc=s96-c", 64)).toBe(
      "https://lh3.googleusercontent.com/a/ACg8oc=s64-c"
    )
    expect(avatarAtSize("https://lh3.googleusercontent.com/a/ACg8oc", 64)).toBe(
      "https://lh3.googleusercontent.com/a/ACg8oc=s64-c"
    )
  })

  it("las demás URLs no cambian", () => {
    const cloud = "https://res.cloudinary.com/demo/image/upload/v1/a.jpg"
    expect(avatarAtSize(cloud, 64)).toBe(cloud)
    expect(avatarAtSize("no es url", 64)).toBe("no es url")
  })
})
