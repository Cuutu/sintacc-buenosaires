import type { ReactNode } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"
import { floorDisplayCount, floorGoogleReviewsDisplay, formatFlooredPrefix } from "@/lib/stats/floor-display-count"
import { homeBtn } from "@/components/home/home-ui"
import { cn } from "@/lib/utils"

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

/**
 * Franja de la comunidad: el único llamado a sugerir de la home (antes había otro
 * bloque naranja) y, abajo, las apps. Los números son lugares y reseñas: "+300
 * usuarios" al lado de "+2.400 lugares" achicaba la comunidad (revisión 20/10).
 */
export function CommunityBand({ stats, children }: { stats?: StatsApi | null; children?: ReactNode }) {
  const metrics = [
    line(stats?.placesCount, "lugares"),
    // Es la suma de reseñas de Google de los lugares (las de CeliMap todavía son pocas):
    // "reseñas" a secas daba a entender que eran de la comunidad (revisión 23/10).
    line(stats?.reviewsCountGoogle ?? stats?.reviewsCount, "reseñas en Google", true),
  ].filter(Boolean) as Array<{ value: string; label: string }>

  return (
    <section className="bg-olive-organic" aria-labelledby="community-heading">
      <div className="container mx-auto max-w-5xl px-4 py-16 text-center md:px-5 md:py-24">
        <p className="mb-3 font-serif text-lg font-medium italic text-cream/80">tu mapa sin gluten</p>
        <h2
          id="community-heading"
          className="text-[28px] font-extrabold leading-[1.05] tracking-[-0.035em] text-cream [text-wrap:balance] md:text-4xl"
        >
          ¿Falta tu lugar favorito?
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-base leading-relaxed text-cream/80">
          Cada lugar lo suma alguien que también come sin gluten. Sugerilo: lo revisamos y lo
          sumamos al mapa para toda la comunidad.
        </p>

        {metrics.length === 2 ? (
          <ul className="mx-auto mt-8 grid max-w-sm grid-cols-2 gap-2">
            {metrics.map((item) => (
              <li key={item.label} className="flex flex-col items-center text-cream">
                <span className="text-3xl font-extrabold tabular-nums md:text-4xl">{item.value}</span>
                <span className="mt-0.5 text-sm text-cream/75">{item.label}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mx-auto mt-8 flex max-w-xs flex-col items-stretch justify-center gap-3 sm:max-w-none sm:flex-row">
          <Link href="/sugerir" className={cn(homeBtn.primary, "focus-visible:ring-offset-[#2D4A34] sm:min-w-[240px]")}>
            <Plus className="h-4 w-4" strokeWidth={2.4} aria-hidden />
            Sugerir un lugar
          </Link>
          <Link href="/mapa" className={cn(homeBtn.secondaryOnDark, "sm:min-w-[240px]")}>
            Ver el mapa
          </Link>
        </div>

        {children}
      </div>
    </section>
  )
}
