"use client"

import { useCallback, useState } from "react"
import { Button } from "@/components/ui/button"
import { Share2 } from "lucide-react"
import { toast } from "sonner"
import { trackEvent } from "@/lib/analytics"

type ShareButtonProps = {
  title: string
  shareUrl: string
  eventName?: "place_share" | "list_share"
  eventProps?: Record<string, string | number | boolean>
  variant?: "default" | "outline" | "ghost"
  className?: string
  showLabel?: boolean
}

export function ShareButton({
  title,
  shareUrl,
  eventName = "place_share",
  eventProps,
  variant = "outline",
  className,
  showLabel = true,
}: ShareButtonProps) {
  const [sharing, setSharing] = useState(false)

  const handleShare = useCallback(async () => {
    if (sharing) return
    setSharing(true)
    try {
      if (navigator.share) {
        await navigator.share({ title, url: shareUrl })
      } else {
        await navigator.clipboard.writeText(shareUrl)
        toast.success("Link copiado")
      }
      trackEvent(eventName, eventProps)
    } catch {
      // cancelado por el usuario
    } finally {
      setSharing(false)
    }
  }, [sharing, title, shareUrl, eventName, eventProps])

  return (
    <Button
      type="button"
      variant={variant}
      className={className ?? "w-full sm:w-auto gap-2 min-h-[44px]"}
      onClick={handleShare}
      disabled={sharing}
    >
      <Share2 className="h-4 w-4" />
      {showLabel ? "Compartir" : <span className="sr-only">Compartir</span>}
    </Button>
  )
}
