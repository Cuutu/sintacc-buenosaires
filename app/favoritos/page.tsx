"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlaceCard } from "@/components/place-card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CreateListModal } from "@/components/lists/CreateListModal"
import { ListCard, type ListWithDetails } from "@/components/lists/ListCard"
import { IPlace } from "@/models/Place"
import { fetchApi } from "@/lib/fetchApi"
import { toast } from "sonner"
import { MapPin, ListPlus, Trash2 } from "lucide-react"

export default function FavoritosPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [favorites, setFavorites] = useState<IPlace[]>([])
  const [lists, setLists] = useState<ListWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [listsLoading, setListsLoading] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)

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

  const fetchLists = async () => {
    setListsLoading(true)
    try {
      const data = await fetchApi<{ lists: ListWithDetails[] }>(
        "/api/lists?mine=1"
      )
      setLists(data.lists ?? [])
    } catch (error: any) {
      toast.error(error?.message || "Error al cargar listas")
    } finally {
      setListsLoading(false)
    }
  }

  const handleDeleteList = async (id: string) => {
    if (!confirm("¿Eliminar esta lista?")) return
    try {
      await fetchApi(`/api/lists/${id}`, { method: "DELETE" })
      toast.success("Lista eliminada")
      fetchLists()
    } catch (error: any) {
      toast.error(error?.message || "Error al eliminar")
    }
  }

  if (!session) {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Guardados</h1>

      <Tabs defaultValue="favoritos" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="favoritos">Favoritos</TabsTrigger>
          <TabsTrigger value="listas" onClick={fetchLists}>
            Mis listas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="favoritos">
          {loading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : favorites.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Todavía no guardaste ningún lugar. Cuando le des Guardar a un
                lugar en su página de detalle, aparecerá acá.
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex justify-end mb-4">
                <Button
                  onClick={() => setCreateModalOpen(true)}
                  className="gap-2"
                >
                  <ListPlus className="h-4 w-4" />
                  Crear lista pública
                </Button>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {favorites.map((place) => (
                  <div key={place._id.toString()} className="space-y-2">
                    <PlaceCard place={place} />
                    <Link href={`/mapa?place=${place._id}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2"
                      >
                        <MapPin className="h-4 w-4" />
                        Ver en mapa
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="listas">
          {listsLoading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : lists.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground space-y-4">
                <p>No tenés listas públicas todavía.</p>
                <p className="text-sm">
                  Creá una lista desde tus favoritos para compartirla con la
                  comunidad. Otros usuarios podrán darle like.
                </p>
                {favorites.length > 0 && (
                  <Button
                    onClick={() => {
                      setCreateModalOpen(true)
                      fetchLists()
                    }}
                    className="gap-2 mt-2"
                  >
                    <ListPlus className="h-4 w-4" />
                    Crear mi primera lista
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {lists.map((list) => (
                <div key={list._id} className="relative group">
                  <ListCard list={list} />
                  <div className="absolute top-2 right-2">
                    <Button
                      size="icon"
                      variant="destructive"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDeleteList(list._id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CreateListModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        favorites={favorites}
        onCreated={fetchLists}
      />
    </div>
  )
}
