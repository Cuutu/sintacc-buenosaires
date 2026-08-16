import Link from "next/link"
import Image from "next/image"
import { TYPES } from "@/lib/constants"
import { getPlacePath } from "@/lib/place-url"
import type { IPlace } from "@/models/Place"
import { formatNearbyDistance } from "./place-detail-ui"

type NearbyPlace = IPlace & {
  stats?: { avgRating?: number; totalReviews?: number }
  distance?: number
}

interface PlaceNearbyRailProps {
  places: NearbyPlace[]
}

export function PlaceNearbyRail({ places }: PlaceNearbyRailProps) {
  const items = places.slice(0, 5)
  if (items.length === 0) return null

  return (
    <section aria-labelledby="nearby-heading">
      <h2 id="nearby-heading" className="mb-4 text-lg font-semibold text-[#1F4D35]">
        Cerca de este lugar
      </h2>
      <div
        className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1"
        data-overflow-allowed="nearby-rail"
      >
        {items.map((place) => {
          const type = TYPES.find((t) => t.value === (place.types?.[0] ?? place.type))
          const photo = place.photos?.[0]
          const distance = formatNearbyDistance(place.distance)
          return (
            <Link
              key={place._id.toString()}
              href={getPlacePath(place)}
              className="w-[220px] shrink-0 rounded-[20px] border border-[#E8E1D6] bg-[#FDFBF7] p-3 transition-transform active:scale-[0.99]"
            >
              <div className="relative mb-3 h-16 w-16 overflow-hidden rounded-2xl bg-[#1F4D35]/10">
                {photo ? (
                  <Image
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
              <p className="mt-1 truncate text-base text-[#5F6B63]">
                {type?.label ?? "Lugar"}
                {distance ? ` · ${distance}` : ""}
              </p>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
