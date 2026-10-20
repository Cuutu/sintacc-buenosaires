import Link from "next/link"
import Image from "next/image"
import { Check, Star } from "lucide-react"
import { getPlacePath } from "@/lib/place-url"
import { resolvePrimarySafety, type PlaceWithStats } from "@/components/featured/featured-utils"
import { CategoryIcon } from "@/components/seo/CategoryIcon"
import { shownRating } from "@/lib/home/featured-trust"
import { cn } from "@/lib/utils"

function plural(n: number, one: string, many: string) {
  return `${n.toLocaleString("es-AR")} ${n === 1 ? one : many}`
}

/** "812", "1,2 mil", "12 mil": en la tarjeta no entra "12.345 en Google" al lado del barrio. */
export function shortCount(n: number): string {
  if (n < 1000) return String(n)
  const thousands = n / 1000
  const value = thousands < 10 ? Math.floor(thousands * 10) / 10 : Math.floor(thousands)
  return `${String(value).replace(".", ",")} mil`
}

/**
 * Puntaje con la cantidad al lado (revisión 20/10: un 5.0 solo, con 1 reseña, parecía
 * inflado). La fuente la elige shownRating: CeliMap con 3 reseñas o más; si tiene menos,
 * Google cuando tiene más reseñas.
 */
export function ratingOf(place: PlaceWithStats): { score: string; detail: string; title: string } | null {
  const rating = shownRating(place)
  if (!rating) return null
  const score = rating.score.toFixed(1)
  if (rating.source === "celimap") {
    const detail = plural(rating.count, "reseña", "reseñas")
    return { score, detail, title: `${score} de 5 en CeliMap, ${detail}` }
  }
  const count = rating.count
  const detail = count > 0 ? `${shortCount(count)} en Google` : "Google"
  return { score, detail, title: `${score} de 5 en Google${count > 0 ? `, ${plural(count, "reseña", "reseñas")}` : ""}` }
}

/**
 * Portada cuando el lugar no tiene foto. El color sale del id (estable entre
 * servidor y cliente), nunca del estado TACC: eso lo dice la etiqueta.
 */
const COVERS = [
  { bg: "bg-[#2D4A34]", texture: "celi-trigo-crema", ink: "text-[#F7F3EB]/80", dark: true },
  { bg: "bg-[#E6DAC4]", texture: "celi-trigo-oliva", ink: "text-[#2D4A34]/70", dark: false },
  { bg: "bg-[#BCC9B0]", texture: "celi-trigo-oliva", ink: "text-[#2D4A34]/70", dark: false },
] as const

function coverFor(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return COVERS[h % COVERS.length]
}

/**
 * La etiqueta es el dato más importante para un celíaco: 100% va en verde lleno con
 * tilde y "Con opciones" en crema con punto terracota, para que no se confundan.
 * Sobre la portada verde, el 100% va en crema (si no, se pierde).
 */
export function SafetyPill({ place, onGreen }: { place: PlaceWithStats; onGreen: boolean }) {
  const safety = resolvePrimarySafety(place)
  if (safety === "dedicated_gf") {
    return (
      <span
        className={cn(
          "inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-xs font-extrabold shadow-[0_4px_12px_-6px_rgba(20,30,23,0.5)]",
          onGreen ? "bg-[#F7F3EB] text-[#1F4D35]" : "bg-[#1F4D35] text-[#F7F3EB] ring-1 ring-[#F7F3EB]/40"
        )}
      >
        <Check className="h-3 w-3" strokeWidth={3.2} aria-hidden />
        100% sin TACC
      </span>
    )
  }
  if (safety === "gf_options") {
    return (
      <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-[#F7F3EB] px-2.5 text-xs font-extrabold text-[#9A3A1B] shadow-[0_4px_12px_-6px_rgba(20,30,23,0.5)]">
        <span className="h-2 w-2 rounded-full bg-[#C85A2E]" aria-hidden />
        Con opciones
      </span>
    )
  }
  // Sin dato claro no se muestra etiqueta.
  return null
}

/** Tarjeta de destacados: foto arriba y el nombre abajo, donde siempre se lee. */
export function HomeFeaturedCard({ place }: { place: PlaceWithStats }) {
  const photo = place.photos?.[0]
  const rating = ratingOf(place)
  const location = place.neighborhood || "Argentina"
  const cover = coverFor(String(place._id))

  return (
    <Link
      href={getPlacePath(place)}
      className="group flex h-full flex-col rounded-[20px] bg-white p-2 shadow-[0_14px_34px_-26px_rgba(31,42,34,0.5),0_0_0_1px_rgba(45,74,52,0.07)] transition-shadow hover:shadow-[0_22px_44px_-24px_rgba(31,42,34,0.55),0_0_0_1px_rgba(45,74,52,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive/40 focus-visible:ring-offset-4 focus-visible:ring-offset-[#F7F3EB]"
    >
      <div
        className={cn(
          "relative aspect-[4/3] w-full overflow-hidden rounded-[14px]",
          photo ? "bg-olive/10" : cn(cover.bg, cover.texture, "flex items-center justify-center")
        )}
      >
        {photo ? (
          <Image
            src={photo}
            alt=""
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            sizes="(max-width: 768px) 80vw, 33vw"
          />
        ) : (
          <CategoryIcon category={place.type} className={cn("h-9 w-9", cover.ink)} />
        )}
        <div className="absolute left-3 top-3">
          <SafetyPill place={place} onGreen={!photo && cover.dark} />
        </div>
      </div>
      <div className="flex flex-1 flex-col px-2 pb-2 pt-3">
        <h3 className="line-clamp-2 font-serif text-[22px] font-medium italic leading-[1.1] tracking-[-0.015em] text-[#2D4A34]">
          {place.name}
        </h3>
        <div className="mt-auto flex items-center justify-between gap-3 pt-2">
          <span className="truncate text-sm font-bold text-[#5E6A60]">{location}</span>
          {rating ? (
            <span
              className="flex shrink-0 items-center gap-1 text-sm font-extrabold text-olive"
              title={rating.title}
            >
              <Star className="h-3.5 w-3.5 fill-[#B84420] text-[#B84420]" strokeWidth={1.5} aria-hidden />
              <span className="tabular-nums">{rating.score}</span>
              <span className="text-xs font-bold text-[#5E6A60]">· {rating.detail}</span>
            </span>
          ) : (
            <span className="shrink-0 text-xs font-bold text-[#5E6A60]">Sin reseñas todavía</span>
          )}
        </div>
      </div>
    </Link>
  )
}
