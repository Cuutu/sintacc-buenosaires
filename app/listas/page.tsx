"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ListCard, type ListWithDetails } from "@/components/lists/ListCard"
import { CreateListModal } from "@/components/lists/CreateListModal"
import { fetchApi } from "@/lib/fetchApi"
import { ListPlus, ArrowLeft, LogIn } from "lucide-react"
import { IPlace } from "@/models/Place"
import { toast } from "sonner"

export default function ListasPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [lists, setLists] = useState<ListWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [favorites, setFavorites] = useState<IPlace[]>([])
  const [canUsePrivateLists, setCanUsePrivateLists] = useState(false)
  const [loadingCreate, setLoadingCreate] = useState(false)

  const fetchPublicLists = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchApi<{ lists: ListWithDetails[] }>("/api/lists")
      setLists(data.lists ?? [])
    } catch {
      setLists([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPublicLists()
  }, [fetchPublicLists])

  const openCreate = async () => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/listas")
      return
    }
    if (status !== "authenticated") return

    setLoadingCreate(true)
    try {
      const [favData, mineData] = await Promise.all([
        fetchApi<{ favorites: Array<{ placeId: IPlace | null }> }>(
          "/api/favorites"
        ).catch(() => ({ favorites: [] })),
        fetchApi<{
          lists: ListWithDetails[]
          canUsePrivateLists?: boolean
        }>("/api/lists?mine=1").catch(() => ({
          lists: [],
          canUsePrivateLists: false,
        })),
      ])

      setFavorites(
        (favData.favorites ?? [])
          .map((f) => f.placeId)
          .filter(
            (p): p is IPlace =>
              Boolean(p && (p as IPlace)._id && (p as IPlace).name)
          )
      )
      setCanUsePrivateLists(Boolean(mineData.canUsePrivateLists))
      setCreateOpen(true)
    } catch (err: any) {
      toast.error(err?.message || "No se pudo abrir el creador")
    } finally {
      setLoadingCreate(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al inicio
      </Link>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight">
            Listas de la comunidad
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Descubrí listas creadas por otros celíacos. Creá la tuya y
            compartila.
          </p>
        </div>
        <Button
          onClick={openCreate}
          disabled={status === "loading" || loadingCreate}
          className="shrink-0 gap-2"
        >
          {status === "unauthenticated" ? (
            <>
              <LogIn className="h-4 w-4" />
              Iniciá sesión para crear
            </>
          ) : (
            <>
              <ListPlus className="h-4 w-4" />
              {loadingCreate ? "Preparando..." : "Crear lista"}
            </>
          )}
        </Button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">
          Cargando...
        </div>
      ) : lists.length === 0 ? (
        <Card>
          <CardContent className="space-y-4 py-12 text-center text-muted-foreground">
            <p>Todavía no hay listas públicas.</p>
            <Button
              onClick={openCreate}
              disabled={status === "loading" || loadingCreate}
              className="gap-2"
            >
              <ListPlus className="h-4 w-4" />
              Crear la primera lista
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map((list) => (
            <ListCard key={list._id} list={list} />
          ))}
        </div>
      )}

      <CreateListModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        favorites={favorites}
        canUsePrivateLists={canUsePrivateLists}
        onCreated={(created) => {
          if (created?.visibility === "PRIVATE_LINK") {
            toast.message("Lista privada creada", {
              description: "La gestionás desde Guardados → Mis listas.",
            })
          } else {
            fetchPublicLists()
          }
        }}
      />
    </div>
  )
}
