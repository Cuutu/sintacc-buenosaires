"use client"

import { ShareButton } from "@/components/share/ShareButton"

type VentureShareButtonProps = {
  ventureName: string
  shareUrl: string
}

export function VentureShareButton({ ventureName, shareUrl }: VentureShareButtonProps) {
  return (
    <ShareButton
      title={`${ventureName} · Celimap`}
      shareUrl={shareUrl}
      eventName="place_share"
      eventProps={{ type: "venture" }}
      className="w-full sm:w-auto gap-2 min-h-[44px]"
    />
  )
}
