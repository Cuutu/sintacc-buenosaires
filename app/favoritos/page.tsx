"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { PlaceCard } from "@/components/place-card"
import { features } from "@/lib/features"
import { IPlace } from "@/models/Place"
import { fetchApi } from "@/lib/fetchApi"
import { toast } from "sonner"

export default function FavoritosPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [favorites, setFavorites] = useState<IPlace[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!features.favorites) {
      router.push("/")
      return
    }

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

  if (!features.favorites) {
    return null
  }

  if (!session) {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Mis favoritos</h1>

      {loading ? (
        <div className="text-center py-8">Cargando...</div>
      ) : favorites.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No tienes favoritos aún. Agrega lugares desde el mapa o las páginas de detalle.
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favorites.map((place) => (
            <PlaceCard key={place._id.toString()} place={place} />
          ))}
        </div>
      )}
    </div>
  )
}
