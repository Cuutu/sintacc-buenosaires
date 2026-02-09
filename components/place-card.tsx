import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Star, MapPin } from "lucide-react"
import { IPlace } from "@/models/Place"

interface PlaceCardProps {
  place: IPlace & { stats?: { avgRating?: number; totalReviews?: number } }
}

export function PlaceCard({ place }: PlaceCardProps) {
  return (
    <Link href={`/lugar/${place._id}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
        {place.photos && place.photos.length > 0 && (
          <div className="relative h-48 w-full overflow-hidden rounded-t-lg">
            <img
              src={place.photos[0]}
              alt={place.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <CardHeader>
          <CardTitle className="line-clamp-1">{place.name}</CardTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{place.neighborhood}</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-2">
            {place.stats?.avgRating && (
              <>
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold">{place.stats.avgRating.toFixed(1)}</span>
                <span className="text-sm text-muted-foreground">
                  ({place.stats.totalReviews || 0})
                </span>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {place.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
