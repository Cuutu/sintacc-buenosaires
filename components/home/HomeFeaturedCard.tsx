import Link from "next/link"
import Image from "next/image"
import { Check, Star } from "lucide-react"
import { getPlacePath } from "@/lib/place-url"
import { resolvePrimarySafety, type PlaceWithStats } from "@/components/featured/featured-utils"
import { cn } from "@/lib/utils"

function ratingOf(place: PlaceWithStats): number | null {
  const google = place.googleSnapshot?.rating
  if (typeof google === "number" && google > 0) return Math.round(google * 10) / 10
  const local = place.stats?.avgRating
  if (typeof local === "number" && local > 0 && (place.stats?.totalReviews ?? 0) > 0) {
    return Math.round(local * 10) / 10
  }
  return null
}

/**
 * Portada tipográfica cuando el lugar no tiene foto. El color sale del id (estable
 * entre renders y servidor/cliente), nunca del estado TACC: eso lo dice la etiqueta.
 */
const COVERS = [
  { bg: "bg-[#2D4A34]", texture: "celi-trigo-crema", ink: "text-[#F7F3EB]", dark: true },
  { bg: "bg-[#E6DAC4]", texture: "celi-trigo-oliva", ink: "text-[#2D4A34]", dark: false },
  { bg: "bg-[#BCC9B0]", texture: "celi-trigo-oliva", ink: "text-[#2D4A34]", dark: false },
] as const

function coverFor(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return COVERS[h % COVERS.length]
}

function SafetyPill({ place, onDark }: { place: PlaceWithStats; onDark: boolean }) {
  const safety = resolvePrimarySafety(place)
  if (safety === "dedicated_gf") {
    return (
      <span
        className={cn(
          "inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-xs font-extrabold",
          onDark ? "bg-[#F7F3EB] text-[#1F4D35]" : "bg-[#2D4A34] text-[#F7F3EB]"
        )}
      >
        <Check className="h-3 w-3" strokeWidth={3.2} aria-hidden />
        100% sin TACC
      </span>
    )
  }
  if (safety === "gf_options") {
    return (
      <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-[#F7F3EB] px-2.5 text-xs font-extrabold text-[#9A3A1B]">
        <span className="h-2 w-2 rounded-full bg-[#C85A2E]" aria-hidden />
        Con opciones
      </span>
    )
  }
  // Sin dato claro no se muestra etiqueta (antes decía "Verificado", que el copy público no permite).
  return null
}

export function HomeFeaturedCard({ place }: { place: PlaceWithStats }) {
  const photo = place.photos?.[0]
  const rating = ratingOf(place)
  const location = place.neighborhood || "Argentina"
  const cover = coverFor(String(place._id))
  const onDark = photo ? true : cover.dark

  return (
    <Link
      href={getPlacePath(place)}
      className="group flex h-full flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive/40 focus-visible:ring-offset-4 focus-visible:ring-offset-[#F7F3EB] rounded-[26px]"
    >
      <div
        className={cn(
          "relative aspect-[4/5] w-full overflow-hidden rounded-[26px]",
          photo ? "bg-olive/10" : cn(cover.bg, cover.texture)
        )}
      >
        {photo ? (
          <>
            <Image
              src={photo}
              alt=""
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              sizes="(max-width: 768px) 80vw, 33vw"
            />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/55 to-transparent" aria-hidden />
          </>
        ) : null}
        <div className="absolute left-3.5 top-3.5">
          <SafetyPill place={place} onDark={onDark} />
        </div>
        <h3
          className={cn(
            "absolute inset-x-[18px] bottom-5 line-clamp-3 font-serif text-[32px] font-medium italic leading-[0.98] tracking-[-0.02em]",
            photo ? "text-white" : cover.ink
          )}
        >
          {place.name}
        </h3>
      </div>
      <div className="mt-3 flex items-center justify-between px-1">
        <span className="truncate text-sm font-bold text-[#5E6A60]">{location}</span>
        {rating != null ? (
          <span className="flex shrink-0 items-center gap-1 text-sm font-extrabold text-olive">
            <Star className="h-3.5 w-3.5 fill-[#B84420] text-[#B84420]" strokeWidth={1.5} aria-hidden />
            <span className="tabular-nums">{rating.toFixed(1)}</span>
          </span>
        ) : null}
      </div>
    </Link>
  )
}
