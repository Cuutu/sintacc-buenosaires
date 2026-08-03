import { Capacitor } from "@capacitor/core"

/** Detecta shell Capacitor (TestFlight / Play), no Safari ni PWA. */
export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false
  try {
    if (Capacitor.isNativePlatform()) return true
  } catch {
    // Capacitor no disponible (SSR / web pura)
  }
  return window.navigator.userAgent.includes("CelimapNative")
}
