import { Capacitor } from "@capacitor/core"

type CapacitorBridge = {
  isNativePlatform?: () => boolean
  getPlatform?: () => string
}

function getWindowCapacitor(): CapacitorBridge | undefined {
  if (typeof window === "undefined") return undefined
  return (window as Window & { Capacitor?: CapacitorBridge }).Capacitor
}

/**
 * Platform from the native-injected bridge first.
 * Bundled `@capacitor/core` inside a remote `server.url` WebView can report `"web"`.
 */
export function getCapacitorPlatform(): string | undefined {
  try {
    const fromWindow = getWindowCapacitor()?.getPlatform?.()
    if (typeof fromWindow === "string" && fromWindow.length > 0) return fromWindow
  } catch {
    // ignore
  }
  try {
    const fromImport = Capacitor.getPlatform()
    if (typeof fromImport === "string" && fromImport.length > 0) return fromImport
  } catch {
    // ignore
  }
  return undefined
}

function hasCapacitorBridge(): boolean {
  if (typeof window === "undefined") return false
  const cap = getWindowCapacitor()
  try {
    if (cap?.isNativePlatform?.()) return true
  } catch {
    // ignore
  }
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

function hasAndroidSignals(): boolean {
  if (typeof window === "undefined") return false
  if (getCapacitorPlatform() === "android") return true
  if (document.documentElement.classList.contains("plt-android")) return true
  return /Android/i.test(window.navigator.userAgent)
}

function hasIosSignals(): boolean {
  if (typeof window === "undefined") return false
  if (getCapacitorPlatform() === "ios") return true
  if (document.documentElement.classList.contains("plt-ios")) return true
  const ua = window.navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(ua)) return true
  // iPadOS 13+ often sends a desktop Macintosh UA.
  if (/Macintosh/i.test(ua) && (window.navigator.maxTouchPoints || 0) > 1) {
    return true
  }
  return false
}

/**
 * iOS Capacitor shell (iPhone + iPad + iPadOS).
 * Do not rely on user-agent alone: iPadOS may identify as macOS.
 */
export function isNativeIosApp(): boolean {
  if (typeof window === "undefined" || !isNativeApp()) return false
  if (hasAndroidSignals()) return false
  if (hasIosSignals()) return true
  // Native shell, not Android: treat as iOS when bundled Capacitor reports
  // `"web"` and iPadOS UA looks like Macintosh without touch hints.
  return true
}

/** Android Capacitor shell (Play / debug APK). */
export function isNativeAndroidApp(): boolean {
  if (typeof window === "undefined" || !isNativeApp()) return false
  return hasAndroidSignals()
}
