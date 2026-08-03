"use client"

/**
 * Media query store estable para useSyncExternalStore.
 * subscribe/getSnapshot cacheados por query → sin resubscribe cada render.
 */

type Listener = () => void

type QueryStore = {
  subscribe: (onStoreChange: Listener) => () => void
  getSnapshot: () => boolean
  getServerSnapshot: () => null
}

const stores = new Map<string, QueryStore>()

function attachListener(media: MediaQueryList, handler: Listener): () => void {
  if (typeof media.addEventListener === "function") {
    media.addEventListener("change", handler)
    return () => media.removeEventListener("change", handler)
  }
  // Safari / WebKit legacy
  media.addListener(handler)
  return () => media.removeListener(handler)
}

export function getMediaQueryStore(query: string): QueryStore {
  const existing = stores.get(query)
  if (existing) return existing

  let media: MediaQueryList | null = null
  const listeners = new Set<Listener>()

  const ensureMedia = () => {
    if (typeof window === "undefined") return null
    if (!media) {
      media = window.matchMedia(query)
      attachListener(media, () => {
        listeners.forEach((l) => l())
      })
    }
    return media
  }

  const store: QueryStore = {
    subscribe(onStoreChange) {
      if (typeof window === "undefined") return () => {}
      ensureMedia()
      listeners.add(onStoreChange)
      return () => {
        listeners.delete(onStoreChange)
      }
    },
    getSnapshot() {
      const m = ensureMedia()
      return m ? m.matches : false
    },
    getServerSnapshot() {
      return null
    },
  }

  stores.set(query, store)
  return store
}

/** Test helper: limpia stores (jsdom). */
export function __resetMediaQueryStoresForTests() {
  stores.clear()
}

export function resolveMapVariant(
  isMobile: boolean | null
): "loading" | "mobile" | "desktop" {
  if (isMobile === null) return "loading"
  return isMobile ? "mobile" : "desktop"
}
