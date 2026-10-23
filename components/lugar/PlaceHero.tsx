import { PlaceImage } from "@/components/place-image"
import { getCoverThemeForLevel } from "@/components/map-view/place-selected-card-model"
import { cn } from "@/lib/utils"
import { CategoryIcon } from "@/components/seo/CategoryIcon"
import { heroSafetyCopy } from "./place-detail-ui"
import { PlaceHeroChrome } from "./PlaceHeroChrome"

interface PlaceHeroProps {
  photos?: string[]
  photoSource?: "community" | "google"
  name: string
  placeId: string
  shareUrl: string
  safetyLevel?: string
  /** Tipo del lugar: sin foto, el encabezado lleva el ícono de la categoría. */
  type?: string
}

export function PlaceHero({
  photos,
  photoSource,
  name,
  placeId,
  shareUrl,
  safetyLevel,
  type,
}: PlaceHeroProps) {
  const hasPhoto = Boolean(photos?.[0])
  const safety = heroSafetyCopy(safetyLevel)
  const cover = getCoverThemeForLevel(safetyLevel)

  return (
    // Sin foto, un encabezado más bajo (antes era un recuadro de 220/380 px casi vacío).
    <div
      className={cn(
        "relative w-full overflow-hidden lg:rounded-[28px]",
        hasPhoto ? "h-[220px] lg:h-[380px]" : "h-[150px] lg:h-[200px]"
      )}
      data-hero={hasPhoto ? "photo" : "cover"}
    >
      {hasPhoto ? (
        <PlaceImage
          src={photos![0]}
          alt={name}
          fill
          priority
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 700px"
        />
      ) : (
        // Portada de color con textura (como las tarjetas) y el ícono de la categoría.
        <div
          className={cn("absolute inset-0", cover.texture)}
          style={{ backgroundColor: cover.bg, color: cover.ink }}
          aria-hidden
        >
          <CategoryIcon
            category={type}
            className="absolute bottom-3 right-5 h-16 w-16 opacity-80 lg:bottom-6 lg:right-6 lg:h-20 lg:w-20"
          />
        </div>
      )}

      {hasPhoto ? (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(31,77,53,0.28) 0%, rgba(31,77,53,0.04) 42%, rgba(15,30,22,0.45) 100%)",
          }}
        />
      ) : null}

      <PlaceHeroChrome placeId={placeId} name={name} shareUrl={shareUrl} />

      <div
        className={`absolute bottom-4 left-5 z-10 inline-flex lg:bottom-6 lg:left-6 ${
          // A la derecha va "Foto: Google" o, sin foto, el ícono de la categoría.
          !hasPhoto || photoSource === "google" ? "max-w-[calc(100%-7rem)]" : "max-w-[calc(100%-2.5rem)]"
        } items-center rounded-full px-4 py-2 text-base font-bold shadow-[0_8px_24px_-12px_rgba(15,30,22,0.55)] ${safety.className}`}
      >
        {safety.label}
      </div>
      {hasPhoto && photoSource === "google" ? (
        <p className="absolute bottom-4 right-5 z-10 text-[10px] font-medium text-white/80 lg:bottom-6 lg:right-6">
          Foto: Google
        </p>
      ) : null}
    </div>
  )
}
