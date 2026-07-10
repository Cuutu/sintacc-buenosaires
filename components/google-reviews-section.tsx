import { ExternalLink, Star } from "lucide-react"
import type { GooglePlaceSnapshot } from "@/models/Place"

type Props = {
  snapshot?: GooglePlaceSnapshot | null
}

export function GoogleReviewsSection({ snapshot }: Props) {
  if (!snapshot?.syncedAt) return null
  if (snapshot.rating == null && !snapshot.reviews?.length && !snapshot.reviewSummaryText) {
    return null
  }

  const snippets =
    snapshot.glutenRelevant?.length > 0
      ? snapshot.glutenRelevant.slice(0, 3)
      : []

  const mapsUrl = snapshot.googleMapsUri

  return (
    <section className="mt-8 pt-6 border-t border-border/40" aria-label="Reseñas de Google">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="text-base font-bold">En Google</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Reseñas de Google · complementan las de la comunidad Celimap
          </p>
        </div>
        {mapsUrl ? (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline shrink-0"
          >
            Ver en Maps <ExternalLink className="h-3 w-3" />
          </a>
        ) : null}
      </div>

      {snapshot.rating != null ? (
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                className={`h-3.5 w-3.5 ${
                  i <= Math.round(snapshot.rating!)
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground/20"
                }`}
              />
            ))}
          </div>
          <span className="text-sm font-bold">{snapshot.rating.toFixed(1)}</span>
          {snapshot.userRatingCount != null ? (
            <span className="text-xs text-muted-foreground">
              · {snapshot.userRatingCount.toLocaleString("es-AR")} opiniones en Google
            </span>
          ) : null}
        </div>
      ) : null}

      {snapshot.glutenSignalSummary ? (
        <p className="text-xs text-muted-foreground mb-3 italic">
          Señal celíaca: {snapshot.glutenSignalSummary}
        </p>
      ) : null}

      {snapshot.reviewSummaryText && snippets.length === 0 ? (
        <p className="text-sm text-foreground/90 mb-3">{snapshot.reviewSummaryText}</p>
      ) : null}

      {snippets.length > 0 ? (
        <ul className="space-y-3">
          {snippets.map((review, i) => (
            <li
              key={`${review.authorName ?? "g"}-${i}`}
              className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5"
            >
              <div className="flex items-center gap-2 mb-1">
                {review.rating != null ? (
                  <span className="text-[11px] font-semibold text-amber-400">
                    ★ {review.rating}
                  </span>
                ) : null}
                {review.authorName ? (
                  <span className="text-[11px] text-muted-foreground">{review.authorName}</span>
                ) : null}
                {review.relativeTime ? (
                  <span className="text-[10px] text-muted-foreground/70">
                    · {review.relativeTime}
                  </span>
                ) : null}
              </div>
              <p className="text-sm leading-relaxed text-foreground/90 line-clamp-4">
                {review.text}
              </p>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="text-[10px] text-muted-foreground/70 mt-3">
        Datos y reseñas provistos por Google. No son reseñas de la comunidad Celimap.
      </p>
    </section>
  )
}
