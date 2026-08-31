import {
  getDevicePlatform,
  getStoreBannerBrowser,
  getStoreIdForPlatform,
  isStoreConfigured,
  type DevicePlatform,
  type StoreBannerBrowser,
  type StoreId,
} from "@/lib/device-platform"

export type BottomPromptKind = "store" | "install"

export const STORE_BANNER_DISMISS_KEY = "celimap_store_banner_dismissed_until_v1"
export const STORE_BANNER_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000

export const STORE_BANNER_SHOWN_SESSION_KEY = "celimap_store_banner_shown_session"

export type BottomPromptInput = {
  platform: DevicePlatform
  browser: StoreBannerBrowser
  nativeApp: boolean
  standalone: boolean
  dismissedUntil: number
  now?: number
  debugBanner?: boolean
}

export function getStoreBannerDismissedUntil(): number {
  if (typeof localStorage === "undefined") return 0
  try {
    const value = Number(localStorage.getItem(STORE_BANNER_DISMISS_KEY) ?? 0)
    return Number.isFinite(value) ? value : 0
  } catch {
    return 0
  }
}

export function snoozeStoreBanner(): void {
  if (typeof localStorage === "undefined") return
  try {
    localStorage.setItem(
      STORE_BANNER_DISMISS_KEY,
      String(Date.now() + STORE_BANNER_SNOOZE_MS)
    )
  } catch {
    // ignore quota / private mode
  }
  notifyBottomPromptChange()
}

const bottomPromptListeners = new Set<() => void>()

export function subscribeBottomPromptChange(fn: () => void): () => void {
  bottomPromptListeners.add(fn)
  return () => {
    bottomPromptListeners.delete(fn)
  }
}

function notifyBottomPromptChange() {
  bottomPromptListeners.forEach((fn) => fn())
}

export function isStoreBannerDebugQuery(search: string): boolean {
  const q = search.startsWith("?") ? search.slice(1) : search
  return new URLSearchParams(q).get("debugBanner") === "1"
}

/** Primer `store_banner_shown` de la tab session. False si ya se emitió. */
export function claimStoreBannerShownSession(): boolean {
  if (typeof sessionStorage === "undefined") return true
  try {
    if (sessionStorage.getItem(STORE_BANNER_SHOWN_SESSION_KEY) === "1") return false
    sessionStorage.setItem(STORE_BANNER_SHOWN_SESSION_KEY, "1")
    return true
  } catch {
    return true
  }
}

export function isStoreBannerEligible(input: BottomPromptInput): boolean {
  if (input.debugBanner) return true
  if (input.nativeApp || input.standalone) return false
  if (input.dismissedUntil > (input.now ?? Date.now())) return false

  const store = getStoreIdForPlatform(input.platform)
  if (!store || !isStoreConfigured(store)) return false

  if (input.platform === "ios") return input.browser !== "safari"
  if (input.platform === "android") return true
  return false
}

/**
 * Un solo prompt inferior a la vez.
 * iOS no-Safari + store listo → store. Resto → install (InstallPrompt decide si abre).
 */
export function resolveBottomPrompt(input: BottomPromptInput): BottomPromptKind {
  return isStoreBannerEligible(input) ? "store" : "install"
}

export function readBottomPromptSnapshot(input: {
  userAgent: string
  maxTouchPoints?: number
  nativeApp: boolean
  standalone: boolean
  dismissedUntil?: number
  now?: number
  debugBanner?: boolean
}): {
  prompt: BottomPromptKind
  platform: DevicePlatform
  browser: StoreBannerBrowser
  store: StoreId | null
} {
  const platform = getDevicePlatform({
    userAgent: input.userAgent,
    maxTouchPoints: input.maxTouchPoints,
  })
  const browser = getStoreBannerBrowser(input.userAgent)
  const dismissedUntil = input.dismissedUntil ?? 0
  const prompt = resolveBottomPrompt({
    platform,
    browser,
    nativeApp: input.nativeApp,
    standalone: input.standalone,
    dismissedUntil,
    now: input.now,
    debugBanner: input.debugBanner,
  })
  return {
    prompt,
    platform,
    browser,
    store: getStoreIdForPlatform(platform) ?? (input.debugBanner ? "ios" : null),
  }
}
