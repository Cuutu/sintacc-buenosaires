"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlaceCard } from "@/components/place-card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CreateListModal } from "@/components/lists/CreateListModal"
import { ManageListModal } from "@/components/lists/ManageListModal"
import { ListCard, type ListWithDetails } from "@/components/lists/ListCard"
import { IPlace } from "@/models/Place"
import { fetchApi } from "@/lib/fetchApi"
import { resolveFavoritosAuthView } from "@/lib/favoritos-auth-view"
import { toast } from "sonner"
import { MapPin, ListPlus, Trash2, Settings2, Lock } from "lucide-react"
import { LIST_VISIBILITY } from "@/lib/lists/constants"

function FavoritosSkeleton({ state }: { state: string }) {
  return (
    <div className="container mx-auto px-4 py-8" data-auth-state={state}>
      <div className="animate-pulse space-y-4">
        <div className="h-10 w-48 rounded bg-muted" />
        <div className="h-32 rounded-lg bg-muted" />
      </div>
    </div>
  )
}

export default function FavoritosPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const redirectedRef = useRef(false)
  const [favorites, setFavorites] = useState<IPlace[]>([])
  const [lists, setLists] = useState<ListWithDetails[]>([])
  const [canUsePrivateLists, setCanUsePrivateLists] = useState(false)
  const [loading, setLoading] = useState(true)
  const [listsLoading, setListsLoading] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [manageList, setManageList] = useState<ListWithDetails | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [sessionHttpStatus, setSessionHttpStatus] = useState<number | null>(null)

  /** Detecta 500 en /api/auth/session — NextAuth no expone status HTTP. */
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" })
        if (!alive) return
        setSessionHttpStatus(res.status)
      } catch {
        if (alive) setSessionHttpStatus(0)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const sessionProbeError =
    sessionHttpStatus === null
      ? null
      : sessionHttpStatus === 0 || sessionHttpStatus >= 500
        ? "No pudimos verificar tu sesión"
        : null

  const fetchFavorites = useCallback(async () => {
    setLoadError(null)
    setLoading(true)
    try {
      const data = await fetchApi<{
        favorites: Array<{ placeId: IPlace | null }>
      }>("/api/favorites")
      setFavorites(
        (data.favorites ?? [])
          .map((f) => f.placeId)
          .filter((p): p is IPlace => Boolean(p && (p as IPlace)._id && (p as IPlace).name))
      )
    } catch (error: any) {
      const message = error?.message || "Error al cargar favoritos"
      setLoadError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  const authView = resolveFavoritosAuthView({
    status: sessionHttpStatus === null ? "loading" : status,
    hasSessionUser: Boolean(session?.user),
    sessionError: sessionProbeError,
  })

  useEffect(() => {
    if (authView.kind === "loading") return
    if (authView.kind === "unauthenticated") {
      if (redirectedRef.current) return
      redirectedRef.current = true
      router.replace("/login")
      return
    }
    if (authView.kind === "ready") {
      redirectedRef.current = false
      fetchFavorites()
    }
  }, [authView.kind, router, fetchFavorites])

  const fetchLists = useCallback(async () => {
    setListsLoading(true)
    try {
      const data = await fetchApi<{
        lists: ListWithDetails[]
        canUsePrivateLists?: boolean
      }>("/api/lists?mine=1")
      setLists(data.lists ?? [])
      setCanUsePrivateLists(Boolean(data.canUsePrivateLists))
    } catch (error: any) {
      toast.error(error?.message || "Error al cargar listas")
    } finally {
      setListsLoading(false)
    }
  }, [])

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

  if (authView.kind === "loading" || authView.kind === "unauthenticated") {
    return <FavoritosSkeleton state={authView.kind} />
  }

  if (authView.kind === "session_error") {
    return (
      <div className="container mx-auto px-4 py-8" data-auth-state="session_error">
        <Card>
          <CardContent className="space-y-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">{authView.message}</p>
            <Button type="button" onClick={() => window.location.reload()}>
              Reintentar
            </Button>
            <div>
              <Button asChild variant="outline">
                <Link href="/">Ir al inicio</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loadError && !loading && favorites.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8" data-auth-state="load_error">
        <h1 className="mb-6 text-3xl font-bold">Guardados</h1>
        <Card>
          <CardContent className="space-y-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">{loadError}</p>
            <Button type="button" onClick={() => fetchFavorites()}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8" data-auth-state="ready">
      <h1 className="mb-6 text-3xl font-bold">Guardados</h1>

      <Tabs defaultValue="favoritos" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="favoritos">Favoritos</TabsTrigger>
          <TabsTrigger value="listas" onClick={() => fetchLists()}>
            Mis listas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="favoritos">
          {loading ? (
            <div className="py-8 text-center">Cargando...</div>
          ) : favorites.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Todavía no guardaste ningún lugar. Cuando le des Guardar a un
                lugar en su página de detalle, aparecerá acá.
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="mb-4 flex justify-end">
                <Button
                  onClick={() => setCreateModalOpen(true)}
                  className="gap-2"
                >
                  <ListPlus className="h-4 w-4" />
                  Crear lista
                </Button>
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
            <div className="py-8 text-center">Cargando...</div>
          ) : lists.length === 0 ? (
            <Card>
              <CardContent className="space-y-4 py-8 text-center text-muted-foreground">
                <p>No tenés listas todavía.</p>
                <p className="text-sm">
                  Creá una lista desde tus favoritos para compartirla con la
                  comunidad
                  {canUsePrivateLists
                    ? " o enviarla en privado a un cliente."
                    : "."}
                </p>
                {favorites.length > 0 && (
                  <Button
                    onClick={() => {
                      setCreateModalOpen(true)
                      fetchLists()
                    }}
                    className="mt-2 gap-2"
                  >
                    <ListPlus className="h-4 w-4" />
                    Crear mi primera lista
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {lists.map((list) => {
                const isPrivate =
                  list.visibility === LIST_VISIBILITY.PRIVATE_LINK ||
                  list.isPublic === false
                return (
                  <div key={list._id} className="group relative">
                    <ListCard
                      list={list}
                      disableLink
                      href={
                        isPrivate
                          ? list.privateSharePath || undefined
                          : `/listas/${list._id}`
                      }
                    />
                    <div className="absolute right-2 top-2 flex gap-1 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-8 w-8"
                        onClick={() => setManageList(list)}
                        aria-label="Gestionar lista"
                      >
                        {isPrivate ? (
                          <Lock className="h-3.5 w-3.5" />
                        ) : (
                          <Settings2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        className="h-8 w-8"
                        onClick={() => handleDeleteList(list._id)}
                        aria-label="Eliminar lista"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CreateListModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        favorites={favorites}
        canUsePrivateLists={canUsePrivateLists}
        onCreated={() => fetchLists()}
      />

      <ManageListModal
        open={Boolean(manageList)}
        onOpenChange={(open) => !open && setManageList(null)}
        list={manageList}
        favorites={favorites}
        canUsePrivateLists={canUsePrivateLists}
        onUpdated={fetchLists}
      />
    </div>
  )
}
