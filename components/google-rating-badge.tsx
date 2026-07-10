import { Star } from "lucide-react"
import type { GooglePlaceSnapshot } from "@/models/Place"

type Props = {
  snapshot?: Pick<GooglePlaceSnapshot, "rating" | "userRatingCount"> | null
  size?: "sm" | "md"
  className?: string
}

export function GoogleRatingBadge({ snapshot, size = "sm", className = "" }: Props) {
  const rating = snapshot?.rating
  const count = snapshot?.userRatingCount
  if (rating == null || !Number.isFinite(rating)) return null

  const textSize = size === "md" ? "text-sm" : "text-xs"
  const iconSize = size === "md" ? "h-3.5 w-3.5" : "h-3 w-3"

  return (
    <span
      className={`inline-flex items-center gap-1 ${textSize} text-muted-foreground ${className}`}
      title="Rating en Google Maps"
    >
      <Star className={`${iconSize} fill-amber-400/80 text-amber-400/80 shrink-0`} />
      <span className="font-semibold text-foreground/90">{rating.toFixed(1)}</span>
      {count != null && count > 0 ? (
        <span className="text-muted-foreground">({count.toLocaleString("es-AR")})</span>
      ) : null}
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground/80">
        Google
      </span>
    </span>
  )
}
