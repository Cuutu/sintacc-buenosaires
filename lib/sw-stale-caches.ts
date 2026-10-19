import { CELIMAP_CACHE_NAME_RE } from "@/lib/native-sw-cleanup"

/**
 * Caches que usa el service worker actual: los cacheName de runtimeCaching en
 * next.config.js, más "start-url" que agrega next-pwa. Un test controla que estén
 * todos; si sumás uno en next.config.js, sumalo acá o se borraría.
 */
export const CURRENT_SW_CACHES: ReadonlySet<string> = new Set([
  "start-url",
  "google-fonts-webfonts",
  "google-fonts-stylesheets",
  "static-image-assets",
  "next-image",
  "apis",
])

/**
 * Restos de versiones viejas del SW: la precarga (que nunca terminaba de instalarse),
 * los tiles de Mapbox y las caches por defecto de next-pwa. Pueden ocupar varios MB.
 */
export function isStaleServiceWorkerCache(name: string): boolean {
  if (CURRENT_SW_CACHES.has(name)) return false
  return name === "mapbox-tiles" || CELIMAP_CACHE_NAME_RE.test(name)
}

/** Borra las caches viejas. Nunca tira error: es limpieza, no puede romper el arranque. */
export async function deleteStaleServiceWorkerCaches(): Promise<string[]> {
  try {
    if (typeof caches === "undefined") return []
    const stale = (await caches.keys()).filter(isStaleServiceWorkerCache)
    await Promise.all(stale.map((name) => caches.delete(name)))
    return stale
  } catch {
    return []
  }
}
