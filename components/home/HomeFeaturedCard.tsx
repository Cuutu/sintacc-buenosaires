import Link from "next/link"
import Image from "next/image"
import { Star } from "lucide-react"
import { BrandBadge } from "@/components/brand/BrandBadge"
import { getPlacePath } from "@/lib/place-url"
import { resolvePrimarySafety, type PlaceWithStats } from "@/components/featured/featured-utils"

function ratingOf(place: PlaceWithStats): number | null {
  const google = place.googleSnapshot?.rating
  if (typeof google === "number" && google > 0) return Math.round(google * 10) / 10
  const local = place.stats?.avgRating
  if (typeof local === "number" && local > 0 && (place.stats?.totalReviews ?? 0) > 0) {
    return Math.round(local * 10) / 10
  }
  return null
}

function SafetyBadge({ place }: { place: PlaceWithStats }) {
  const safety = resolvePrimarySafety(place)
  if (safety === "dedicated_gf") return <BrandBadge variant="dedicated" size="sm" />
  if (safety === "gf_options") return <BrandBadge variant="options" size="sm" />
  return <BrandBadge variant="community" size="sm">Verificado</BrandBadge>
}

export function HomeFeaturedCard({ place }: { place: PlaceWithStats }) {
  const photo = place.photos?.[0]
  const rating = ratingOf(place)
  const location = place.neighborhood || "Argentina"

  return (
    <Link
      href={getPlacePath(place)}
      className="group flex h-full flex-col overflow-hidden rounded-[24px] border border-olive/10 bg-cream-card shadow-soft transition-transform duration-300 hover:-translate-y-0.5 hover:border-olive/20 hover:shadow-card"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-olive/10">
        {photo ? (
          <Image
            src={photo}
            alt=""
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-olive/20 via-cream to-terracotta/15" />
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-xl font-bold leading-snug text-olive">{place.name}</h3>
        <p className="mt-1 text-sm text-[#4D6554]">{location}</p>
        {rating != null ? (
          <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-olive">
            <Star className="h-4 w-4 fill-terracotta text-terracotta" strokeWidth={1.5} aria-hidden />
            <span className="tabular-nums">{rating.toFixed(1)}</span>
          </p>
        ) : null}
        <div className="mt-4">
          <SafetyBadge place={place} />
        </div>
      </div>
    </Link>
  )
}
