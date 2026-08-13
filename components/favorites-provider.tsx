"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { useSession } from "next-auth/react"
import { features } from "@/lib/features"

type FavoritesContextValue = {
  ids: Set<string>
  loaded: boolean
  isFavorite: (placeId: string) => boolean
  add: (placeId: string) => void
  remove: (placeId: string) => void
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null)

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const userId = session?.user?.id
  const [ids, setIds] = useState<Set<string>>(new Set())
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!features.favorites) {
      setLoaded(true)
      return
    }
    if (status === "unauthenticated") {
      setIds(new Set())
      setLoaded(true)
      return
    }
    if (status !== "authenticated" || !userId) return

    let alive = true
    fetch("/api/favorites?ids=1")
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!alive) return
        const list = Array.isArray(data.placeIds) ? data.placeIds : []
        setIds(new Set(list.map(String)))
        setLoaded(true)
      })
      .catch(() => {
        if (alive) setLoaded(true)
      })

    return () => {
      alive = false
    }
  }, [status, userId])

  const add = useCallback((placeId: string) => {
    setIds((prev) => {
      const next = new Set(prev)
      next.add(placeId)
      return next
    })
  }, [])

  const remove = useCallback((placeId: string) => {
    setIds((prev) => {
      const next = new Set(prev)
      next.delete(placeId)
      return next
    })
  }, [])

  const isFavorite = useCallback((placeId: string) => ids.has(placeId), [ids])

  const value = useMemo(
    () => ({ ids, loaded, isFavorite, add, remove }),
    [ids, loaded, isFavorite, add, remove]
  )

  return (
    <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
  )
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext)
  if (!ctx) {
    return {
      ids: new Set(),
      loaded: true,
      isFavorite: () => false,
      add: () => undefined,
      remove: () => undefined,
    }
  }
  return ctx
}
