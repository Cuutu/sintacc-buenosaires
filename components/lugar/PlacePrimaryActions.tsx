"use client"

import { MapPinned, Share2 } from "lucide-react"
import { toast } from "sonner"
import { trackEvent } from "@/lib/analytics"
import { flushFirstPartyQueue } from "@/lib/analytics-client"
import { recordCommitment } from "@/lib/analytics-discovery"
import { PlaceSaveButton } from "./PlaceSaveButton"
import { placePrimaryBtnClass, placeSecondaryBtnClass } from "./place-detail-ui"

interface PlacePrimaryActionsProps {
  mapsUrl: string
  placeId: string
  name: string
  shareUrl: string
}

export function PlacePrimaryActions({
  mapsUrl,
  placeId,
  name,
  shareUrl,
}: PlacePrimaryActionsProps) {
  const handleShare = async () => {
    trackEvent("place_share", { placeId, surface: "place_detail" })
    recordCommitment("place_share", placeId)
    flushFirstPartyQueue(false)
    try {
      if (navigator.share) {
        await navigator.share({ title: `${name} · CeliMap`, url: shareUrl })
      } else {
        await navigator.clipboard.writeText(shareUrl)
        toast.success("Link copiado")
      }
    } catch {
      /* cancelado */
    }
  }

  return (
    <div className="space-y-3">
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        data-directions="true"
        data-place-id={placeId}
        className={placePrimaryBtnClass}
      >
        <MapPinned className="h-5 w-5" />
        Cómo llegar
      </a>
      <div className="grid grid-cols-2 gap-3">
        <PlaceSaveButton placeId={placeId} variant="labeled" />
        <button type="button" onClick={handleShare} className={placeSecondaryBtnClass}>
          <Share2 className="h-5 w-5" />
          Compartir
        </button>
      </div>
    </div>
  )
}
