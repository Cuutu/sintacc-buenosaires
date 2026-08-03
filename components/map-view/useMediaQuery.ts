"use client"

import { useSyncExternalStore } from "react"
import { getMediaQueryStore } from "@/lib/media-query-store"

/**
 * null = SSR / sin medir aún.
 * Evita montar MapDesktop en phone por default false.
 */
export function useMediaQuery(query: string): boolean | null {
  const store = getMediaQueryStore(query)
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot)
}

export function useIsMobile(): boolean | null {
  return useMediaQuery("(max-width: 768px)")
}

export { resolveMapVariant } from "@/lib/media-query-store"
