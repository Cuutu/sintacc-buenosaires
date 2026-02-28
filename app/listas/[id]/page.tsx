"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlaceCard } from "@/components/place-card"
import { fetchApi } from "@/lib/fetchApi"
import { toast } from "sonner"
import { MapPin, Heart, User, ArrowLeft } from "lucide-react"
import { IPlace } from "@/models/Place"
import type { ListWithDetails } from "@/components/lists/ListCard"

export default function ListaDetailPage() {
  const params = useParams()
  const id = params.id as string
  const { data: session } = useSession()
  const [list, setList] = useState<ListWithDetails | null>(null)
  const [liked, setLiked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [likeLoading, setLikeLoading] = useState(false)

  useEffect(() => {
    if (!id) return
    fetchList()
  }, [id])

  const fetchList = async () => {
    try {
      const data = await fetchApi<ListWithDetails>(`/api/lists/${id}`)
      setList(data)
    } catch (error: any) {
      toast.error(error?.message || "Lista no encontrada")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!id || !session) return
    fetchApi<{ liked: boolean }>(`/api/lists/${id}/liked`)
      .then((res) => setLiked(res.liked))
      .catch(() => {})
  }, [id, session])

  const handleLike = async () => {
    if (!session) {
      toast.error("Iniciá sesión para dar like")
      return
    }
    setLikeLoading(true)
    try {
      const res = await fetchApi<{ liked: boolean; likesCount: number }>(
        `/api/lists/${id}/like`,
        { method: "POST" }
      )
      setLiked(res.liked)
      if (list) setList({ ...list, likesCount: res.likesCount })
    } catch (error: any) {
      toast.error(error?.message || "Error al dar like")
    } finally {
      setLikeLoading(false)
    }
  }

  if (loading || !list) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          {loading ? "Cargando..." : "Lista no encontrada"}
        </div>
      </div>
    )
  }

  const places = (list.placeIds ?? []) as IPlace[]

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        href="/favoritos"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a guardados
      </Link>

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">{list.name}</h1>
          {list.description && (
            <p className="text-muted-foreground mt-2">{list.description}</p>
          )}
          <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              {list.createdBy?.image ? (
                <img
                  src={list.createdBy.image}
                  alt=""
                  className="w-6 h-6 rounded-full"
                />
              ) : (
                <User className="h-4 w-4" />
              )}
              {list.createdBy?.name ?? "Usuario"}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="h-4 w-4" />
              {list.likesCount} likes
            </span>
          </div>
        </div>
        {session && (
          <Button
            variant={liked ? "default" : "outline"}
            onClick={handleLike}
            disabled={likeLoading}
            className="gap-2 shrink-0"
          >
            <Heart
              className={`h-4 w-4 ${liked ? "fill-current" : ""}`}
            />
            {liked ? "Te gusta" : "Me gusta"}
          </Button>
        )}
      </div>

      <h2 className="text-xl font-semibold mb-4">
        {places.length} lugar{places.length !== 1 ? "es" : ""}
      </h2>

      {places.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Esta lista no tiene lugares todavía.
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {places.map((place) => (
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
