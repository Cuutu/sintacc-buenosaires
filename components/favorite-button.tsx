"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Heart } from "lucide-react"
import { features } from "@/lib/features"
import { trackEvent } from "@/lib/analytics"
import { useFavorites } from "@/components/favorites-provider"
import { cn } from "@/lib/utils"

interface FavoriteButtonProps {
  placeId: string
  /** Si true, muestra "Guardar" y usa estilo outline (para hero) */
  showLabel?: boolean
  className?: string
}

export function FavoriteButton({ placeId, showLabel, className }: FavoriteButtonProps) {
  const { data: session } = useSession()
  const { isFavorite, add, remove } = useFavorites()
  const [loading, setLoading] = useState(false)
  const favorited = isFavorite(placeId)

  const toggleFavorite = async () => {
    if (!session) return

    setLoading(true)
    try {
      if (favorited) {
        const res = await fetch(`/api/favorites?placeId=${placeId}`, { method: "DELETE" })
        if (res.ok) {
          remove(placeId)
          trackEvent("favorite_remove", { placeId })
        }
      } else {
        const res = await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ placeId }),
        })
        if (res.ok || res.status === 400) {
          add(placeId)
          trackEvent("favorite_add", { placeId })
        }
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
      className={cn(showLabel ? "min-h-[48px]" : undefined, className)}
      onClick={toggleFavorite}
      disabled={loading}
      aria-label={favorited ? "Quitar de favoritos" : "Agregar a favoritos"}
      aria-pressed={favorited}
    >
      <Heart
        className={`h-5 w-5 ${showLabel ? "mr-2" : ""} ${
          favorited ? "fill-red-500 text-red-500" : ""
        }`}
      />
      {showLabel && "Guardar"}
    </Button>
  )
}
