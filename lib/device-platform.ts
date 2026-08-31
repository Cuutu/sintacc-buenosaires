export type DevicePlatform = "ios" | "android" | "desktop"

export type StoreId = "ios" | "android"

export type StoreBannerBrowser =
  | "safari"
  | "chrome"
  | "instagram"
  | "facebook"
  | "whatsapp"
  | "other"

export const CELIMAP_APP_STORE_URL = "https://apps.apple.com/ar/app/celimap/id6797278308"

/** Vacío hasta que exista ficha en Play Store. */
export const CELIMAP_PLAY_STORE_URL = ""

export const STORE_BANNER_ANDROID_ENABLED = false

export const CELIMAP_STORE_URLS: Record<StoreId, string> = {
  ios: CELIMAP_APP_STORE_URL,
  android: CELIMAP_PLAY_STORE_URL,
}

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

/**
 * Navegador / in-app. Orden importa: WhatsApp y Facebook a menudo
 * incluyen tokens Safari/Version.
 */
export function getStoreBannerBrowser(userAgent: string): StoreBannerBrowser {
  const ua = userAgent
  if (/Instagram/i.test(ua)) return "instagram"
  if (/FBAN|FBAV|FB_IAB|FB4A/i.test(ua)) return "facebook"
  if (/WhatsApp/i.test(ua)) return "whatsapp"
  if (/CriOS|Chrome\//i.test(ua) && !/Edg/i.test(ua)) return "chrome"
  if (/FxiOS|EdgiOS|Edg\/|OPiOS|DuckDuckGo|GSA\//i.test(ua)) return "other"
  if (/Version\/[\d.]+/i.test(ua) && /Safari\//i.test(ua)) return "safari"
  return "other"
}

/** Safari nativo iOS: único lugar donde Apple pinta Smart App Banner. */
export function isNativeIosSafari(
  input: {
    userAgent?: string
    maxTouchPoints?: number
  } = {}
): boolean {
  if (getDevicePlatform(input) !== "ios") return false
  const ua =
    input.userAgent ??
    (typeof navigator !== "undefined" ? navigator.userAgent : "")
  return getStoreBannerBrowser(ua) === "safari"
}

export function getStoreIdForPlatform(platform: DevicePlatform): StoreId | null {
  if (platform === "ios") return "ios"
  if (platform === "android") return "android"
  return null
}

export function isStoreConfigured(store: StoreId): boolean {
  if (store === "android") return STORE_BANNER_ANDROID_ENABLED && Boolean(CELIMAP_PLAY_STORE_URL)
  return Boolean(CELIMAP_STORE_URLS.ios)
}

export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false
  const standalone = window.matchMedia?.("(display-mode: standalone)")?.matches
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone
  return Boolean(standalone || iosStandalone)
}
