import { ExternalLink, Star } from "lucide-react"
import type { GooglePlaceSnapshot } from "@/models/Place"
import { placeCardClass } from "./place-detail-ui"

type Props = {
  snapshot?: GooglePlaceSnapshot | null
}

export function PlaceGoogleSection({ snapshot }: Props) {
  if (!snapshot?.syncedAt) return null
  if (snapshot.rating == null && !snapshot.userRatingCount) return null

  const mapsUrl = snapshot.googleMapsUri

  return (
    <section
      id="google-reviews-section"
      className={`${placeCardClass} p-5`}
      aria-labelledby="google-reviews-heading"
    >
      <h2 id="google-reviews-heading" className="text-lg font-semibold text-[#1F4D35]">
        En Google
      </h2>
      <p className="mt-1 text-base text-[#5F6B63]">Reseñas externas, no de CeliMap.</p>

      {snapshot.rating != null && (
        <p className="mt-4 flex items-center gap-2 text-base text-[#1F4D35]">
          <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
          <span className="font-semibold">{snapshot.rating.toFixed(1)}</span>
          {snapshot.userRatingCount != null ? (
            <span className="text-[#5F6B63]">
              ({snapshot.userRatingCount.toLocaleString("es-AR")} reseñas)
            </span>
          ) : null}
        </p>
      )}

      {mapsUrl ? (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex h-11 items-center gap-2 rounded-2xl border-2 border-[#1F4D35]/30 px-4 text-base font-semibold text-[#1F4D35] hover:bg-[#1F4D35]/5"
        >
          Ver en Google Maps
          <ExternalLink className="h-4 w-4" />
        </a>
      ) : null}
    </section>
  )
}
