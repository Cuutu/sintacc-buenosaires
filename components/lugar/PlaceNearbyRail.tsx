import Link from "next/link"
import Image from "next/image"
import { PlaceImage } from "@/components/place-image"
import { TYPES } from "@/lib/constants"
import { getPlacePath } from "@/lib/place-url"
import type { NearbyPlaceCard } from "@/lib/place-nearby"
import { inferSafetyLevel } from "@/components/featured/featured-utils"
import { formatNearbyDistance } from "./place-detail-ui"

interface PlaceNearbyRailProps {
  places: NearbyPlaceCard[]
}

export function PlaceNearbyRail({ places }: PlaceNearbyRailProps) {
  const items = places.slice(0, 5)
  if (items.length === 0) return null

  return (
    <section aria-labelledby="nearby-heading">
      <h2 id="nearby-heading" className="mb-4 text-lg font-semibold text-[#1F4D35] lg:text-[22px] lg:font-extrabold lg:tracking-[-0.02em]">
        Cerca de este lugar
      </h2>
      <div
        className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1 lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-4 lg:overflow-visible lg:px-0"
        data-overflow-allowed="nearby-rail"
      >
        {items.map((place) => {
          const type = TYPES.find((t) => t.value === (place.types?.[0] ?? place.type))
          const photo = place.photos?.[0]
          const distance = formatNearbyDistance(place.distance)
          return (
            <Link
              key={place._id}
              href={getPlacePath(place)}
              className="w-[220px] shrink-0 rounded-[20px] border border-[#E8E1D6] bg-[#FDFBF7] p-3 transition-[transform,border-color] hover:border-[#1F4D35]/25 active:scale-[0.99] lg:w-auto"
            >
              <div className="relative mb-3 h-16 w-16 overflow-hidden rounded-2xl bg-[#1F4D35]/10">
                {photo ? (
                  <PlaceImage
                    src={photo}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-[#F8F5EF]">
                    <Image
                      src="/CelimapLOGO.png"
                      alt=""
                      width={36}
                      height={48}
                      className="h-10 w-auto object-contain"
                    />
                  </div>
                )}
              </div>
              <p className="truncate text-base font-semibold text-[#1F4D35]">{place.name}</p>
              <p className="mt-1 truncate text-[15px] text-[#5F6B63]">
                {type?.label ?? "Lugar"} · {distance ? `a ${distance}` : "mismo barrio"}
              </p>
              <NearbySafetyChip place={place} />
            </Link>
          )
        })}
      </div>
    </section>
  )
}

/** La misma etiqueta que en las tarjetas: 100% sin TACC o Con opciones (revisión 23/10). */
function NearbySafetyChip({ place }: { place: NearbyPlaceCard }) {
  const level = inferSafetyLevel({ tags: place.tags, safetyLevel: place.safetyLevel as never })
  if (level === "dedicated_gf") {
    return (
      <span className="mt-2 inline-flex h-6 items-center gap-1 rounded-full bg-[#1F4D35] px-2.5 text-xs font-extrabold text-[#F7F3EB]">
        100% sin TACC
      </span>
    )
  }
  if (level === "gf_options") {
    return (
      <span className="mt-2 inline-flex h-6 items-center gap-1.5 rounded-full bg-[#F1ECE2] px-2.5 text-xs font-extrabold text-[#1F4D35]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#B84420]" aria-hidden />
        Con opciones
      </span>
    )
  }
  return null
}
