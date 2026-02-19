"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Heart } from "lucide-react"
import { features } from "@/lib/features"

interface FavoriteButtonProps {
  placeId: string
  /** Si true, muestra "Guardar" y usa estilo outline (para hero) */
  showLabel?: boolean
}

export function FavoriteButton({ placeId, showLabel }: FavoriteButtonProps) {
  const { data: session } = useSession()
  const [isFavorite, setIsFavorite] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!features.favorites || !session) return

    checkFavorite()
  }, [placeId, session])

  const checkFavorite = async () => {
    try {
      const res = await fetch("/api/favorites")
      const data = await res.json()
      const favoriteIds = data.favorites?.map((f: any) => f.placeId._id.toString()) || []
      setIsFavorite(favoriteIds.includes(placeId))
    } catch (error) {
      console.error("Error checking favorite:", error)
    }
  }

  const toggleFavorite = async () => {
    if (!session) return

    setLoading(true)
    try {
      if (isFavorite) {
        await fetch(`/api/favorites?placeId=${placeId}`, { method: "DELETE" })
        setIsFavorite(false)
      } else {
        await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ placeId }),
        })
        setIsFavorite(true)
      }
    } catch (error) {
      console.error("Error toggling favorite:", error)
    } finally {
      setLoading(false)
    }
  }

  if (!features.favorites || !session) {
    return null
  }

  return (
    <Button
      variant={showLabel ? "outline" : "ghost"}
      size={showLabel ? "lg" : "icon"}
      className={showLabel ? "min-h-[48px]" : undefined}
      onClick={toggleFavorite}
      disabled={loading}
    >
      <Heart
        className={`h-5 w-5 ${showLabel ? "mr-2" : ""} ${
          isFavorite ? "fill-red-500 text-red-500" : ""
        }`}
      />
      {showLabel && "Guardar"}
    </Button>
  )
}
