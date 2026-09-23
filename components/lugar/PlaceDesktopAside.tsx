"use client"

import { Clock, MapPin, Phone } from "lucide-react"
import { getOpenStatusDetail } from "@/lib/opening-hours"
import { PlacePrimaryActions } from "./PlacePrimaryActions"
import { PlaceReportCard } from "./PlaceReportCard"
import { placeCardClass } from "./place-detail-ui"

interface PlaceDesktopAsideProps {
  mapsUrl: string
  placeId: string
  name: string
  shareUrl: string
  address: string
  openingHours?: string
  phone?: string
  onReportSuccess?: () => void
}

export function PlaceDesktopAside({
  mapsUrl,
  placeId,
  name,
  shareUrl,
  address,
  openingHours,
  phone,
  onReportSuccess,
}: PlaceDesktopAsideProps) {
  const openStatusDetail = openingHours ? getOpenStatusDetail(openingHours) : null

  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24 space-y-4">
        <div className={`${placeCardClass} p-5`}>
          <PlacePrimaryActions
            mapsUrl={mapsUrl}
            placeId={placeId}
            name={name}
            shareUrl={shareUrl}
          />

          <div className="divide-y divide-[#E8E1D6] border-t border-[#E8E1D6]">
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 py-4 hover:opacity-80"
            >
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[#1F4D35]" />
              <span className="text-base leading-relaxed text-[#1F4D35]">{address}</span>
            </a>
            {openStatusDetail ? (
              <div className="flex items-start gap-3 py-4">
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-[#1F4D35]" />
                <div>
                  <p
                    className={`text-base font-semibold ${openStatusDetail.isOpen ? "text-[#2D7A4E]" : "text-[#8B5A3C]"}`}
                  >
                    {openStatusDetail.label}
                  </p>
                  {openStatusDetail.relativeText && (
                    <p className="mt-0.5 text-sm text-[#5F6B63]">
                      {openStatusDetail.relativeText}
                    </p>
                  )}
                </div>
              </div>
            ) : null}
            {phone ? (
              <a href={`tel:${phone}`} className="flex items-center gap-3 py-4 hover:opacity-80">
                <Phone className="h-5 w-5 shrink-0 text-[#1F4D35]" />
                <span className="text-base text-[#1F4D35]">{phone}</span>
              </a>
            ) : null}
          </div>
        </div>

        <PlaceReportCard placeId={placeId} onSuccess={onReportSuccess} />
      </div>
    </aside>
  )
}
