/**
 * Limpieza SW/caches PWA solo en shell Capacitor (CelimapNative).
 * No toca cookies, sesión NextAuth, IndexedDB de usuario, favoritos ni credenciales.
 *
 * Ciclo por versión:
 *   null → cleanup + set "reloading" + caller recarga una vez
 *   "reloading" → set "done" (post-reload settle, sin segunda reload)
 *   "done" → skip
 */

import { isNativeApp } from "@/lib/native-app"

const CLEANUP_FLAG_PREFIX = "celimap_native_sw_cleanup:"

/** Caches creadas por next-pwa / workbox / runtimeCaching Celimap. */
export const CELIMAP_CACHE_NAME_RE =
  /^(workbox-precache|workbox-runtime|start-url|next-static|next-data|next-image|static-js|static-style|static-font|static-image|static-data|static-audio|static-video|google-fonts|apis|others|cross-origin|pages-rsc|celimap)/i

function cleanupVersion(): string {
  return (
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
    process.env.NEXT_PUBLIC_BUILD_ID ||
    "local"
  ).slice(0, 16)
}

export function cleanupFlagKey(): string {
  return `${CLEANUP_FLAG_PREFIX}${cleanupVersion()}`
}

export function isCelimapServiceWorkerScript(
  scriptURL: string,
  originHint?: string
): boolean {
  if (!scriptURL) return true
  try {
    const base =
      originHint ||
      (typeof location !== "undefined" ? location.href : "https://www.celimap.com.ar/")
    const u = new URL(scriptURL, base)
    const currentOrigin =
      originHint || (typeof location !== "undefined" ? location.origin : undefined)
    if (currentOrigin && u.origin !== currentOrigin) return false
    if (
      !currentOrigin &&
      /^https?:/i.test(scriptURL) &&
      !/(^|\.)celimap\.com\.ar$/i.test(u.hostname) &&
      u.hostname !== "localhost" &&
      u.hostname !== "127.0.0.1"
    ) {
      return false
    }
    const path = u.pathname
    return path.endsWith("/sw.js") || path.endsWith("sw.js") || /workbox/i.test(path)
  } catch {
    return /sw\.js|workbox/i.test(scriptURL)
  }
}

export function isCelimapPwaCacheName(name: string): boolean {
  return CELIMAP_CACHE_NAME_RE.test(name) || name.includes("workbox-precache")
}

export type NativeSwCleanupResult = {
  ran: boolean
  unregistered: number
  cachesDeleted: number
  skipped: boolean
  /** Caller debe recargar exactamente una vez si true */
  shouldReload: boolean
  settledAfterReload: boolean
}

/**
 * Desregistra SW Celimap + borra caches PWA.
 * Idempotente por versión. Nunca lanza. Nunca loop de reload.
 */
export async function cleanupNativeCelimapServiceWorkers(): Promise<NativeSwCleanupResult> {
  const empty: NativeSwCleanupResult = {
    ran: false,
    unregistered: 0,
    cachesDeleted: 0,
    skipped: true,
    shouldReload: false,
    settledAfterReload: false,
  }
  try {
    if (typeof window === "undefined") return empty
    if (!isNativeApp()) return empty
    if (!("serviceWorker" in navigator)) return empty

    const flag = cleanupFlagKey()
    let prior: string | null = null
    try {
      prior = localStorage.getItem(flag)
    } catch {
      prior = null
    }

    if (prior === "done") {
      return { ...empty, skipped: true }
    }

    // Post-reload de esta versión: asentar y no volver a recargar
    if (prior === "reloading") {
      try {
        localStorage.setItem(flag, "done")
      } catch {
        /* ignore */
      }
      return {
        ...empty,
        skipped: true,
        settledAfterReload: true,
        shouldReload: false,
      }
    }

    let unregistered = 0
    const regs = await navigator.serviceWorker.getRegistrations()
    for (const reg of regs) {
      const script =
        reg.active?.scriptURL ||
        reg.waiting?.scriptURL ||
        reg.installing?.scriptURL ||
        ""
      if (script && !isCelimapServiceWorkerScript(script)) continue
      if (script === "" && reg.scope && !reg.scope.startsWith(location.origin)) continue
      try {
        const ok = await reg.unregister()
        if (ok) unregistered += 1
      } catch {
        /* ignore */
      }
    }

    let cachesDeleted = 0
    if (typeof caches !== "undefined") {
      const keys = await caches.keys()
      for (const key of keys) {
        if (!isCelimapPwaCacheName(key)) continue
        try {
          if (await caches.delete(key)) cachesDeleted += 1
        } catch {
          /* ignore */
        }
      }
    }

    const didWork = unregistered > 0 || cachesDeleted > 0 || Boolean(navigator.serviceWorker.controller)
    try {
      // Siempre marcar ciclo: si había controller/SW, pedimos una reload controlada
      localStorage.setItem(flag, didWork ? "reloading" : "done")
    } catch {
      /* ignore */
    }

    return {
      ran: true,
      unregistered,
      cachesDeleted,
      skipped: false,
      shouldReload: didWork,
      settledAfterReload: false,
    }
  } catch {
    return empty
  }
}

export function __nativeSwCleanupFlagKeyForTests(): string {
  return cleanupFlagKey()
}

export function __resetNativeSwCleanupFlagForTests(): void {
  try {
    localStorage.removeItem(cleanupFlagKey())
  } catch {
    /* ignore */
  }
}
