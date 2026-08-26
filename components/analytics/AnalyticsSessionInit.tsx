"use client"

import { useEffect } from "react"
import { getAnalyticsPlatform } from "@/lib/analytics-platform"
import {
  ANALYTICS_COLD_START_KEY,
  ANALYTICS_FIRST_OPEN_KEY,
  ANALYTICS_LAST_ACTIVITY_KEY,
  ANALYTICS_OPEN_DEBOUNCE_KEY,
  runAnalyticsLifecycleOpen,
} from "@/lib/analytics-session"
import { trackEvent } from "@/lib/analytics"
import { isNativeApp } from "@/lib/native-app"

const SESSION_ONLY_KEYS = new Set([
  ANALYTICS_COLD_START_KEY,
  ANALYTICS_OPEN_DEBOUNCE_KEY,
])

function createLifecycleStorage(): {
  storage: {
    getItem(key: string): string | null
    setItem(key: string, value: string): void
  }
  available: boolean
} {
  if (typeof window === "undefined") {
    return { storage: { getItem: () => null, setItem: () => {} }, available: false }
  }

  let local: Storage | null = null
  let session: Storage | null = null
  try {
    local = window.localStorage
  } catch {
    local = null
  }
  try {
    session = window.sessionStorage
  } catch {
    session = null
  }

  if (!local && !session) {
    return { storage: { getItem: () => null, setItem: () => {} }, available: false }
  }

  return {
    available: true,
    storage: {
      getItem(key: string) {
        try {
          if (SESSION_ONLY_KEYS.has(key)) {
            return session?.getItem(key) ?? null
          }
          return local?.getItem(key) ?? null
        } catch {
          return null
        }
      },
      setItem(key: string, value: string) {
        if (SESSION_ONLY_KEYS.has(key)) {
          session?.setItem(key, value)
          return
        }
        local?.setItem(key, value)
      },
    },
  }
}

/**
 * Inicialización única de analytics de sesión (P0).
 * Montado una vez en el root layout — no se re-ejecuta por navegación interna.
 */
export function AnalyticsSessionInit() {
  useEffect(() => {
    const { storage, available } = createLifecycleStorage()
    if (!available) return

    const platform = getAnalyticsPlatform()

    const track = (
      event: "first_open" | "app_open" | "session_start",
      properties: { platform: ReturnType<typeof getAnalyticsPlatform> }
    ) => {
      trackEvent(event, properties)
    }

    runAnalyticsLifecycleOpen({
      storage,
      track,
      platform,
      reason: "cold_start",
    })

    const cleanups: Array<() => void> = []

    if (isNativeApp()) {
      let removeStateListener: (() => void) | undefined

      void import("@capacitor/app").then(({ App }) => {
        void App.addListener("appStateChange", ({ isActive }) => {
          if (!isActive) return
          runAnalyticsLifecycleOpen({
            storage,
            track,
            platform: getAnalyticsPlatform(),
            reason: "foreground",
          })
        }).then((handle) => {
          removeStateListener = () => {
            void handle.remove()
          }
        })
      })

      cleanups.push(() => {
        removeStateListener?.()
      })
    } else {
      let wasHidden = false

      const onVisibilityChange = () => {
        if (document.visibilityState === "hidden") {
          wasHidden = true
          return
        }
        if (document.visibilityState === "visible" && wasHidden) {
          wasHidden = false
          runAnalyticsLifecycleOpen({
            storage,
            track,
            platform: getAnalyticsPlatform(),
            reason: "visibility",
          })
        }
      }

      document.addEventListener("visibilitychange", onVisibilityChange)
      cleanups.push(() => {
        document.removeEventListener("visibilitychange", onVisibilityChange)
      })
    }

    return () => {
      cleanups.forEach((fn) => fn())
    }
  }, [])

  return null
}
