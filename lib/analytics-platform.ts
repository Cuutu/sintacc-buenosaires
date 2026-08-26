import { isStandaloneDisplay } from "@/lib/device-platform"
import {
  isNativeAndroidApp,
  isNativeApp,
  isNativeIosApp,
} from "@/lib/native-app"

export type AnalyticsPlatform =
  | "web"
  | "pwa"
  | "ios_native"
  | "android_native"

/**
 * Plataforma de producto para eventos P0 de sesión/apertura.
 * Usa detección Capacitor del proyecto (no solo userAgent).
 */
export function getAnalyticsPlatform(): AnalyticsPlatform {
  if (typeof window === "undefined") return "web"

  if (isNativeApp()) {
    if (isNativeAndroidApp()) return "android_native"
    if (isNativeIosApp()) return "ios_native"
    return "ios_native"
  }

  if (isStandaloneDisplay()) return "pwa"
  return "web"
}
