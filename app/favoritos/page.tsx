"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlaceCard } from "@/components/place-card"
import { IPlace } from "@/models/Place"
import { fetchApi } from "@/lib/fetchApi"
import { toast } from "sonner"
import { MapPin } from "lucide-react"

export default function FavoritosPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [favorites, setFavorites] = useState<IPlace[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session) {
      router.push("/login")
      return
    }

    fetchFavorites()
  }, [session, router])

  const fetchFavorites = async () => {
    try {
      const data = await fetchApi<{
        favorites: Array<{ placeId: IPlace }>
      }>("/api/favorites")
      setFavorites(data.favorites?.map((f) => f.placeId) || [])
    } catch (error: any) {
      toast.error(error?.message || "Error al cargar favoritos")
    } finally {
      setLoading(false)
    }
  }

  if (!session) {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Guardados</h1>

      {loading ? (
        <div className="text-center py-8">Cargando...</div>
      ) : favorites.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Todavía no guardaste ningún lugar. Cuando le des Guardar a un lugar en su página de detalle, aparecerá acá.
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favorites.map((place) => (
            <div key={place._id.toString()} className="space-y-2">
              <PlaceCard place={place} />
              <Link href={`/mapa?place=${place._id}`}>
                <Button variant="outline" size="sm" className="w-full gap-2">
                  <MapPin className="h-4 w-4" />
                  Ver en mapa
                </Button>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
