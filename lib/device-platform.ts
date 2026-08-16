export type DevicePlatform = "ios" | "android" | "desktop"

export const CELIMAP_APP_STORE_URL = "https://apps.apple.com/ar/app/celimap/id6797278308"

export function getDevicePlatform(
  input: {
    userAgent?: string
    maxTouchPoints?: number
  } = {}
): DevicePlatform {
  const ua =
    input.userAgent ??
    (typeof navigator !== "undefined" ? navigator.userAgent : "")
  const touch =
    input.maxTouchPoints ??
    (typeof navigator !== "undefined" ? navigator.maxTouchPoints || 0 : 0)

  if (/Android/i.test(ua)) return "android"
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios"
  // iPadOS 13+ se reporta como Macintosh.
  if (/Macintosh/i.test(ua) && touch > 1) return "ios"
  return "desktop"
}

export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false
  const standalone = window.matchMedia?.("(display-mode: standalone)")?.matches
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone
  return Boolean(standalone || iosStandalone)
}
