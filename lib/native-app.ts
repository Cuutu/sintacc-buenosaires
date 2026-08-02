/** Detecta shell Capacitor (user agent CelimapNative/1 en capacitor.config). */
export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false
  return window.navigator.userAgent.includes("CelimapNative")
}
