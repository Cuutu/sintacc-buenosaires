"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Heart } from "lucide-react"
import { features } from "@/lib/features"
import { persistFavoriteToggle } from "@/lib/favorites-persist"
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
  const { isFavorite, ids, add, remove } = useFavorites()
  const [loading, setLoading] = useState(false)
  const favorited = isFavorite(placeId)

  const toggleFavorite = async () => {
    if (!session) return

    setLoading(true)
    try {
      await persistFavoriteToggle(placeId, favorited, ids, { add, remove })
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
