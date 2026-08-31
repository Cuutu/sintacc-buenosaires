import Image from "next/image"
import { emptyHeroPinSrc, heroSafetyCopy } from "./place-detail-ui"
import { PlaceHeroChrome } from "./PlaceHeroChrome"

interface PlaceHeroProps {
  photos?: string[]
  photoSource?: "community" | "google"
  name: string
  placeId: string
  shareUrl: string
  safetyLevel?: string
}

export function PlaceHero({
  photos,
  photoSource,
  name,
  placeId,
  shareUrl,
  safetyLevel,
}: PlaceHeroProps) {
  const hasPhoto = Boolean(photos?.[0])
  const safety = heroSafetyCopy(safetyLevel)
  const emptyPinSrc = emptyHeroPinSrc(safetyLevel)

  return (
    <div className="relative h-[220px] w-full overflow-hidden lg:rounded-[24px]">
      {hasPhoto ? (
        <Image
          src={photos![0]}
          alt={name}
          fill
          priority
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 760px"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-[#F8F5EF]">
          <Image
            src={emptyPinSrc}
            alt=""
            width={88}
            height={112}
            priority
            className="h-[112px] w-auto object-contain"
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
      ) : (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-16"
          style={{
            background: "linear-gradient(180deg, transparent, rgba(248,245,239,0.9))",
          }}
        />
      )}

      <PlaceHeroChrome placeId={placeId} name={name} shareUrl={shareUrl} />

      <div
        className={`absolute bottom-4 left-5 z-10 inline-flex ${
          hasPhoto && photoSource === "google" ? "max-w-[calc(100%-7rem)]" : "max-w-[calc(100%-2.5rem)]"
        } items-center rounded-full px-4 py-2 text-base font-bold shadow-[0_8px_24px_-12px_rgba(15,30,22,0.55)] ${safety.className}`}
      >
        {safety.label}
      </div>
      {hasPhoto && photoSource === "google" ? (
        <p className="absolute bottom-4 right-5 z-10 text-[10px] font-medium text-white/80">
          Foto: Google
        </p>
      ) : null}
    </div>
  )
}
