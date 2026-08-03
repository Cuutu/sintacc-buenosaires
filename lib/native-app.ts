import { Capacitor } from "@capacitor/core"

function hasCapacitorBridge(): boolean {
  if (typeof window === "undefined") return false
  const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } })
    .Capacitor
  if (cap?.isNativePlatform?.()) return true
  try {
    if (Capacitor.isNativePlatform()) return true
  } catch {
    // ignore
  }
  const root = document.documentElement
  if (
    root.classList.contains("plt-capacitor") ||
    root.classList.contains("hybrid") ||
    root.classList.contains("plt-ios") ||
    root.classList.contains("plt-android")
  ) {
    return true
  }
  return window.navigator.userAgent.includes("CelimapNative")
}

/** Detecta shell Capacitor (TestFlight / Play), no Safari ni PWA. */
export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false
  return hasCapacitorBridge()
}
