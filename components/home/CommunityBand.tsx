import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { floorDisplayCount, floorGoogleReviewsDisplay, formatFlooredPrefix } from "@/lib/stats/floor-display-count"

type StatsApi = {
  placesCount?: number
  reviewsCountGoogle?: number
  reviewsCount?: number
  usersCount?: number
}

function line(raw: number | undefined, label: string, google?: boolean) {
  if (typeof raw !== "number") return null
  const floored = google ? floorGoogleReviewsDisplay(raw) : floorDisplayCount(raw)
  if (!floored) return null
  return { value: formatFlooredPrefix(floored), label }
}

export function CommunityBand({ stats }: { stats?: StatsApi | null }) {
  const metrics = [
    line(stats?.placesCount, "lugares"),
    line(stats?.reviewsCountGoogle ?? stats?.reviewsCount, "reseñas", true),
    line(stats?.usersCount, "usuarios"),
  ].filter(Boolean) as Array<{ value: string; label: string }>

  return (
    <section className="bg-olive-organic" aria-labelledby="community-heading">
      <div className="container mx-auto max-w-5xl px-4 py-12 text-center md:py-16">
        <p className="mb-3 font-serif text-sm italic text-cream/80">tu mapa sin gluten</p>
        <h2
          id="community-heading"
          className="font-display text-2xl font-extrabold text-cream md:text-4xl"
        >
          La comunidad que hace crecer el mapa
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-cream/75 md:text-base">
          Cada lugar lo suma alguien que también come sin gluten. Ayudá a que el mapa siga creciendo.
        </p>

        {metrics.length === 3 ? (
          // Tres columnas iguales: en el teléfono quedaban 2 + 1.
          <ul className="mx-auto mt-8 grid max-w-xl grid-cols-3 gap-2">
            {metrics.map((item) => (
              <li key={item.label} className="flex flex-col items-center text-cream">
                <span className="font-display text-2xl font-bold tabular-nums md:text-3xl">
                  {item.value}
                </span>
                <span className="mt-0.5 text-sm text-cream/70">{item.label}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mx-auto mt-8 flex max-w-xs flex-col items-stretch justify-center gap-3 sm:max-w-none sm:flex-row">
          <Button asChild size="lg" className="h-12 min-h-[48px] px-8 sm:w-[220px]">
            <Link href="/sugerir" className="flex items-center gap-2">
              Sugerir un lugar
              <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-12 min-h-[48px] border-cream bg-transparent px-8 text-cream hover:bg-cream/10 sm:w-[220px]"
          >
            <Link href="/mapa">Ver el mapa</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
