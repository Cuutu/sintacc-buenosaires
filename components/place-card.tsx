import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Star, MapPin } from "lucide-react"
import { IPlace } from "@/models/Place"

interface PlaceCardProps {
  place: IPlace & { stats?: { avgRating?: number; totalReviews?: number } }
  onMapClick?: (place: IPlace) => void
}

const TYPE_ICONS: Record<string, string> = {
  restaurant: "🍽️",
  cafe: "☕",
  bakery: "🥐",
  store: "🛒",
  icecream: "🍦",
  bar: "🍺",
  other: "📍",
}

export function PlaceCard({ place, onMapClick }: PlaceCardProps) {
  const typeIcon = TYPE_ICONS[place.type] || "📍"

  const cardContent = (
      <Card className="place-card-hover overflow-hidden cursor-pointer h-full border border-border/50 hover:border-primary/50 rounded-xl group bg-card/50">
        {place.photos && place.photos.length > 0 ? (
          <div className="relative h-40 w-full overflow-hidden">
            <img
              src={place.photos[0]}
              alt={place.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-2 left-3 right-3">
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-background/90 backdrop-blur text-xs font-medium">
                {typeIcon} {place.neighborhood}
              </span>
            </div>
          </div>
        ) : (
          <div className="relative h-24 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent flex items-center justify-center">
            <span className="text-4xl">{typeIcon}</span>
            <span className="absolute bottom-2 left-3 px-2.5 py-1 rounded-lg bg-background/90 text-xs font-medium shadow-sm">
              {place.neighborhood}
            </span>
          </div>
        )}
        <CardHeader className="pb-2">
          <CardTitle className="line-clamp-2 text-lg group-hover:text-primary transition-colors">
            {place.name}
          </CardTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0 text-primary/70" />
            <span className="line-clamp-1">{place.neighborhood}</span>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              {place.stats?.avgRating ? (
                <>
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400 shrink-0" />
                  <span className="font-semibold">{place.stats.avgRating.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">
                    ({place.stats.totalReviews})
                  </span>
                </>
              ) : (
                <span className="text-xs text-muted-foreground">Sin reseñas aún</span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {place.tags.slice(0, 3).map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-xs font-medium rounded-md bg-primary/10 text-primary hover:bg-primary/20"
                >
                  {tag.replace(/_/g, " ")}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
  )

  if (onMapClick) {
    return (
      <div onClick={() => onMapClick(place)}>
        {cardContent}
        <button
          type="button"
          className="block mt-2 text-sm text-primary hover:underline text-center w-full"
          onClick={(e) => {
            e.stopPropagation()
            onMapClick(place)
          }}
        >
          Ver detalle →
        </button>
      </div>
    )
  }

  return <Link href={`/lugar/${place._id}`}>{cardContent}</Link>
}
