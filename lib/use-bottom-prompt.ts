"use client"

import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { isNativeApp } from "@/lib/native-app"
import { isStandaloneDisplay, type StoreBannerBrowser, type StoreId } from "@/lib/device-platform"
import {
  getStoreBannerDismissedUntil,
  isStoreBannerDebugQuery,
  readBottomPromptSnapshot,
  snoozeStoreBanner,
  subscribeBottomPromptChange,
  type BottomPromptKind,
} from "@/lib/bottom-prompt"

export function useBottomPrompt() {
  const searchParams = useSearchParams()
  const debugBanner = isStoreBannerDebugQuery(searchParams.toString())
  const [prompt, setPrompt] = useState<BottomPromptKind>("install")
  const [browser, setBrowser] = useState<StoreBannerBrowser>("other")
  const [store, setStore] = useState<StoreId | null>(null)
  const [ready, setReady] = useState(false)

  const recompute = useCallback(() => {
    if (typeof window === "undefined") return
    const snap = readBottomPromptSnapshot({
      userAgent: window.navigator.userAgent,
      maxTouchPoints: window.navigator.maxTouchPoints || 0,
      nativeApp: isNativeApp(),
      standalone: isStandaloneDisplay(),
      dismissedUntil: getStoreBannerDismissedUntil(),
      debugBanner,
    })
    setPrompt(snap.prompt)
    setBrowser(snap.browser)
    setStore(snap.store)
    setReady(true)
  }, [debugBanner])

  useEffect(() => {
    recompute()
    return subscribeBottomPromptChange(recompute)
  }, [recompute])

  const dismissStore = useCallback(() => {
    snoozeStoreBanner()
  }, [])

  return { prompt, browser, store, ready, debugBanner, dismissStore }
}
