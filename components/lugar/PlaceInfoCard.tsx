import { Globe, MapPin, Phone } from "lucide-react"
import { placeCardClass } from "./place-detail-ui"
import { PlaceHoursToggle } from "./PlaceHoursToggle"

interface PlaceInfoCardProps {
  address: string
  mapsUrl: string
  openingHours?: string
  phone?: string
  website?: string
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

        {openingHours ? <PlaceHoursToggle hours={openingHours} /> : null}

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
