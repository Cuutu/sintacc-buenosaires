"use client"

import { useState } from "react"
import { ChevronDown, Clock, Globe, MapPin, Phone } from "lucide-react"
import { isOpenNow } from "@/lib/opening-hours"
import { placeCardClass } from "./place-detail-ui"

interface PlaceInfoCardProps {
  address: string
  mapsUrl: string
  openingHours?: string
  phone?: string
  website?: string
}

function HoursRow({ hours }: { hours: string }) {
  const [open, setOpen] = useState(false)
  const status = isOpenNow(hours)
  const parts = hours.split(/[,;]/).map((p) => p.trim()).filter(Boolean)
  const summary = parts[0] ?? hours
  const expandable = parts.length > 1 || hours.length > 42

  return (
    <div className="flex items-start gap-3 py-4">
      <Clock className="mt-0.5 h-5 w-5 shrink-0 text-[#1F4D35]" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-base text-[#1F4D35]">
              {expandable ? (open ? "Horarios" : summary) : hours}
            </p>
            {status != null && (
              <p className="mt-1 text-base font-semibold text-[#1F4D35]">
                {status ? "Abierto ahora" : "Cerrado ahora"}
              </p>
            )}
          </div>
          {expandable && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#1F4D35] hover:bg-[#1F4D35]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F4D35]/40"
              aria-label={open ? "Ocultar horarios" : "Ver horarios"}
            >
              <ChevronDown className={`h-5 w-5 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
          )}
        </div>
        {expandable && open && (
          parts.length > 1 ? (
            <ul className="mt-2 space-y-1 text-base text-[#5F6B63]">
              {parts.map((part) => (
                <li key={part}>{part}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-base text-[#5F6B63]">{hours}</p>
          )
        )}
      </div>
    </div>
  )
}

export function PlaceInfoCard({
  address,
  mapsUrl,
  openingHours,
  phone,
  website,
}: PlaceInfoCardProps) {
  const websiteLabel = website
    ? website.replace(/^https?:\/\//, "").replace(/\/$/, "")
    : ""

  return (
    <section className={`${placeCardClass} px-5`} aria-labelledby="place-info-heading">
      <h2 id="place-info-heading" className="pt-5 text-lg font-semibold text-[#1F4D35]">
        Información
      </h2>
      <div className="divide-y divide-[#E8E1D6]">
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-3 py-4 text-left transition-colors hover:opacity-80"
        >
          <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[#1F4D35]" />
          <span className="text-base leading-relaxed text-[#1F4D35]">{address}</span>
        </a>

        {openingHours ? <HoursRow hours={openingHours} /> : null}

        {phone ? (
          <a href={`tel:${phone}`} className="flex items-center gap-3 py-4 hover:opacity-80">
            <Phone className="h-5 w-5 shrink-0 text-[#1F4D35]" />
            <span className="text-base text-[#1F4D35]">{phone}</span>
          </a>
        ) : null}

        {website ? (
          <a
            href={website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 py-4 hover:opacity-80"
          >
            <Globe className="h-5 w-5 shrink-0 text-[#1F4D35]" />
            <span className="truncate text-base text-[#1F4D35]">{websiteLabel}</span>
          </a>
        ) : null}
      </div>
    </section>
  )
}
