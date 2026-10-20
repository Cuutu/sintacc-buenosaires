import { Check, MapPin, Navigation, Search, Star } from "lucide-react"
import type { PlaceWithStats } from "@/components/featured/featured-utils"
import { ratingOf } from "@/components/home/HomeFeaturedCard"
import { CategoryIcon } from "@/components/seo/CategoryIcon"

/**
 * Celular dibujado a la derecha del hero, solo en compu ancha (revisión 20/10: la mitad
 * derecha eran pines sueltos). Es todo SVG y texto: no carga imágenes, así que no suma
 * peso ni compite con el LCP, y en el celular no se dibuja (display: none). La tarjeta de
 * abajo muestra el primer destacado real; si no llegó, una genérica sin nombre inventado.
 */

const PINS = [
  { x: 62, y: 214, tone: "dedicated" },
  { x: 196, y: 168, tone: "options" },
  { x: 212, y: 276, tone: "dedicated" },
  { x: 92, y: 318, tone: "options" },
  { x: 168, y: 352, tone: "dedicated" },
  { x: 38, y: 392, tone: "dedicated" },
  { x: 232, y: 404, tone: "options" },
] as const

function Pin({ x, y, tone, selected = false }: { x: number; y: number; tone: "dedicated" | "options"; selected?: boolean }) {
  const fill = tone === "dedicated" ? "#2D4A34" : "#D4633A"
  const scale = selected ? 1.45 : 1
  return (
    <g transform={`translate(${x - 12 * scale} ${y - 32 * scale}) scale(${scale})`}>
      <ellipse cx="12" cy="32" rx="6" ry="2" fill="#000" opacity="0.18" />
      <path
        d="M12 0C5.4 0 0 5.2 0 11.7 0 20.4 12 32 12 32s12-11.6 12-20.3C24 5.2 18.6 0 12 0z"
        fill={fill}
        stroke="#F7F3EB"
        strokeWidth="1.6"
      />
      {tone === "dedicated" ? (
        <path d="M7.5 12l3 3 6-6.5" fill="none" stroke="#F7F3EB" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <circle cx="12" cy="11.7" r="3.6" fill="#F7F3EB" />
      )}
    </g>
  )
}

function MapDrawing() {
  return (
    <svg viewBox="0 0 270 570" className="absolute inset-0 h-full w-full" aria-hidden>
      <rect width="270" height="570" fill="#EEE7D8" />
      <g transform="rotate(-14 135 285)">
        <rect x="150" y="196" width="96" height="74" rx="8" fill="#D3DDC5" />
        <rect x="-20" y="430" width="120" height="90" rx="10" fill="#D3DDC5" />
        <path d="M-40 520 C 60 470, 140 560, 320 500" fill="none" stroke="#C9DBE0" strokeWidth="26" />
        <g stroke="#FBF8F2" strokeWidth="6" strokeLinecap="round">
          {[60, 130, 200, 270, 340, 410, 480].map((y) => (
            <line key={`h${y}`} x1="-60" y1={y} x2="330" y2={y} />
          ))}
          {[20, 90, 160, 230, 300].map((x) => (
            <line key={`v${x}`} x1={x} y1="-40" x2={x} y2="610" />
          ))}
        </g>
        <g stroke="#FFFFFF" strokeWidth="12" strokeLinecap="round">
          <line x1="125" y1="-40" x2="125" y2="610" />
          <line x1="-60" y1="445" x2="330" y2="150" />
        </g>
      </g>
      {PINS.map((pin) => (
        <Pin key={`${pin.x}-${pin.y}`} x={pin.x} y={pin.y} tone={pin.tone} />
      ))}
      <Pin x={128} y={262} tone="dedicated" selected />
    </svg>
  )
}

export function HeroPhoneMockup({ place }: { place?: PlaceWithStats | null }) {
  const rating = place ? ratingOf(place) : null

  return (
    <div
      aria-hidden
      data-hero-mockup
      className="pointer-events-none absolute right-5 top-[70px] hidden w-[290px] rotate-[2.5deg] select-none xl:block"
    >
      <div className="rounded-[46px] bg-[#13221A] p-[10px] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.65),0_0_0_1px_rgba(247,243,235,0.12)]">
        <div className="relative h-[570px] overflow-hidden rounded-[36px] bg-[#EEE7D8]">
          <MapDrawing />

          {/* Buscador y filtro, como en la app. */}
          <div className="absolute inset-x-3 top-4">
            <div className="flex h-10 items-center gap-2 rounded-full bg-white px-3.5 text-xs font-bold text-[#2D4A34]/55 shadow-[0_6px_16px_-8px_rgba(31,42,34,0.45)]">
              <Search className="h-3.5 w-3.5 text-[#2D4A34]" strokeWidth={2.4} />
              Buscá un lugar o ciudad
            </div>
            <div className="mt-2 flex gap-1.5 whitespace-nowrap">
              <span className="inline-flex h-7 items-center gap-1 rounded-full bg-[#2D4A34] px-2.5 text-xs font-extrabold text-[#F7F3EB]">
                <Check className="h-3 w-3" strokeWidth={3} />
                Solo 100%
              </span>
              <span className="inline-flex h-7 items-center rounded-full bg-white px-2.5 text-xs font-bold text-[#2D4A34] shadow-[0_4px_10px_-6px_rgba(31,42,34,0.4)]">
                Cafés
              </span>
              <span className="inline-flex h-7 items-center rounded-full bg-white px-2.5 text-xs font-bold text-[#2D4A34] shadow-[0_4px_10px_-6px_rgba(31,42,34,0.4)]">
                Panaderías
              </span>
            </div>
          </div>

          {/* Tarjeta del lugar elegido. */}
          <div className="absolute inset-x-0 bottom-0 rounded-t-[26px] bg-white px-4 pb-5 pt-2.5 shadow-[0_-12px_30px_-18px_rgba(31,42,34,0.5)]">
            <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-[#2D4A34]/15" />
            <div className="flex gap-3">
              <div className="celi-trigo-crema flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] bg-[#2D4A34]">
                <CategoryIcon category={place?.type ?? "bakery"} className="h-6 w-6 text-[#F7F3EB]/85" />
              </div>
              <div className="min-w-0">
                <span className="inline-flex h-6 items-center gap-1 rounded-full bg-[#1F4D35] px-2 text-xs font-extrabold text-[#F7F3EB]">
                  <Check className="h-3 w-3" strokeWidth={3.2} />
                  100% sin TACC
                </span>
                <p className="mt-1 truncate font-serif text-[22px] font-medium italic leading-tight text-[#2D4A34]">
                  {place?.name ?? "Lugares cerca tuyo"}
                </p>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-3 text-xs font-bold text-[#5E6A60]">
              <span className="flex min-w-0 items-center gap-1">
                <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                <span className="truncate">{place?.neighborhood ?? "Argentina"}</span>
              </span>
              {rating ? (
                <span className="flex shrink-0 items-center gap-1 text-[#2D4A34]">
                  <Star className="h-3.5 w-3.5 fill-[#B84420] text-[#B84420]" strokeWidth={1.5} />
                  {rating.score}
                  <span className="text-[#5E6A60]">· {rating.detail}</span>
                </span>
              ) : null}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <span className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[12px] bg-[#2D4A34] text-xs font-extrabold text-[#F7F3EB]">
                <Navigation className="h-3.5 w-3.5" strokeWidth={2.4} />
                Cómo llegar
              </span>
              <span className="inline-flex h-9 items-center justify-center rounded-[12px] border border-[#2D4A34]/20 text-xs font-extrabold text-[#2D4A34]">
                Ver ficha
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
