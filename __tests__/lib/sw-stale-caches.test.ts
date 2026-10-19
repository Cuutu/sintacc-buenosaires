/**
 * @jest-environment node
 */
import fs from "fs"
import path from "path"
import {
  CURRENT_SW_CACHES,
  deleteStaleServiceWorkerCaches,
  isStaleServiceWorkerCache,
} from "@/lib/sw-stale-caches"

describe("caches viejas del service worker", () => {
  it("CURRENT_SW_CACHES tiene todos los cacheName de next.config.js", () => {
    const cfg = fs.readFileSync(path.join(__dirname, "../../next.config.js"), "utf8")
    const names = [...cfg.matchAll(/cacheName:\s*"([^"]+)"/g)].map((m) => m[1])
    expect(names.length).toBeGreaterThan(0)
    for (const name of names) expect(CURRENT_SW_CACHES.has(name)).toBe(true)
  })

  it("borra la precarga vieja, los tiles de Mapbox y las caches por defecto de next-pwa", () => {
    expect(isStaleServiceWorkerCache("workbox-precache-v2-https://www.celimap.com.ar/")).toBe(true)
    expect(isStaleServiceWorkerCache("mapbox-tiles")).toBe(true)
    expect(isStaleServiceWorkerCache("static-js-assets")).toBe(true)
    expect(isStaleServiceWorkerCache("pages-rsc-prefetch")).toBe(true)
  })

  it("no toca las caches actuales ni las ajenas", () => {
    for (const name of CURRENT_SW_CACHES) expect(isStaleServiceWorkerCache(name)).toBe(false)
    expect(isStaleServiceWorkerCache("mi-cache")).toBe(false)
  })

  it("deleteStaleServiceWorkerCaches borra solo las viejas", async () => {
    const deleted: string[] = []
    ;(globalThis as { caches?: unknown }).caches = {
      keys: async () => ["apis", "mapbox-tiles", "workbox-precache-v2-x", "otra"],
      delete: async (name: string) => {
        deleted.push(name)
        return true
      },
    }
    await expect(deleteStaleServiceWorkerCaches()).resolves.toEqual(["mapbox-tiles", "workbox-precache-v2-x"])
    expect(deleted).toEqual(["mapbox-tiles", "workbox-precache-v2-x"])
    delete (globalThis as { caches?: unknown }).caches
  })
})
