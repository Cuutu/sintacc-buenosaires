import Link from "next/link"
import { Star } from "lucide-react"
import { BrandBadge } from "@/components/brand/BrandBadge"
import type { HeroProofPlace } from "@/lib/home/get-hero-proof-places"

function Stars({ rating }: { rating: number }) {
  const filled = Math.round(rating)
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={
            index < filled
              ? "h-3.5 w-3.5 fill-terracotta text-terracotta"
              : "h-3.5 w-3.5 text-olive/25"
          }
          strokeWidth={1.5}
        />
      ))}
    </span>
  )
}

function safetyBadge(safety: HeroProofPlace["safety"]) {
  if (safety === "dedicated_gf") return <BrandBadge variant="dedicated" size="sm" />
  if (safety === "gf_options") return <BrandBadge variant="options" size="sm" />
  return null
}

export function HeroProofCards({ places }: { places: HeroProofPlace[] }) {
  if (places.length === 0) return null

  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
      {places.map((place) => {
        const badge = safetyBadge(place.safety)
        return (
        <li key={place.id}>
          <Link
            href={place.href}
            className="block rounded-[20px] border border-olive/10 bg-cream-card p-4 shadow-soft transition-colors hover:border-olive/20"
          >
            <p className="font-display text-base font-bold leading-tight text-olive">
              {place.name}
            </p>
            <p className="mt-1 text-sm text-[#4D6554]">{place.location}</p>
            {place.rating != null ? (
              <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-olive">
                <Stars rating={place.rating} />
                <span className="tabular-nums">{place.rating.toFixed(1)}</span>
                <span className="sr-only">de 5</span>
              </p>
            ) : (
              <p className="mt-3 text-sm text-[#4D6554]">Sin calificación aún</p>
            )}
            {badge ? <div className="mt-3">{badge}</div> : null}
          </Link>
        </li>
        )
      })}
    </ul>
  )
}
