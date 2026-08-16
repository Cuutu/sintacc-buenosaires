"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Heart } from "lucide-react"
import { features } from "@/lib/features"
import { trackEvent } from "@/lib/analytics"
import { useFavorites } from "@/components/favorites-provider"
import { cn } from "@/lib/utils"
import { placeSecondaryBtnClass } from "./place-detail-ui"

interface PlaceSaveButtonProps {
  placeId: string
  variant: "icon" | "labeled"
  className?: string
}

export function PlaceSaveButton({ placeId, variant, className }: PlaceSaveButtonProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const { isFavorite, add, remove } = useFavorites()
  const [loading, setLoading] = useState(false)
  const favorited = isFavorite(placeId)

  const toggle = async () => {
    if (!session) {
      router.push("/login")
      return
    }
    if (!features.favorites) return
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

  const label = favorited ? "Guardado" : "Guardar"

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={loading}
        aria-label={favorited ? "Quitar de guardados" : "Guardar lugar"}
        aria-pressed={favorited}
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-full bg-[#F8F5EF]/88 text-[#1F4D35] shadow-sm backdrop-blur-md transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F4D35]/40",
          className
        )}
      >
        <Heart className={cn("h-5 w-5", favorited && "fill-[#C85A2E] text-[#C85A2E]")} />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      aria-pressed={favorited}
      className={cn(placeSecondaryBtnClass, className)}
    >
      <Heart className={cn("h-5 w-5", favorited && "fill-[#C85A2E] text-[#C85A2E]")} />
      {label}
    </button>
  )
}
