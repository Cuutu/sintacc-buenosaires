"use client"

import { useCallback, useState } from "react"
import { Button } from "@/components/ui/button"
import { Share2 } from "lucide-react"
import { toast } from "sonner"

type VentureShareButtonProps = {
  ventureName: string
  shareUrl: string
}

export function VentureShareButton({ ventureName, shareUrl }: VentureShareButtonProps) {
  const [sharing, setSharing] = useState(false)

  const handleShare = useCallback(async () => {
    if (sharing) return
    setSharing(true)
    const title = `${ventureName} · Celimap`
    try {
      if (navigator.share) {
        await navigator.share({ title, url: shareUrl })
      } else {
        await navigator.clipboard.writeText(shareUrl)
        toast.success("Link copiado")
      }
    } catch {
      /* cancelado */
    } finally {
      setSharing(false)
    }
  }, [sharing, ventureName, shareUrl])

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full sm:w-auto gap-2 min-h-[44px]"
      onClick={handleShare}
      disabled={sharing}
    >
      <Share2 className="h-4 w-4" />
      Compartir
    </Button>
  )
}
