"use client"

import { useCallback, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { ListCard, type ListWithDetails } from "@/components/lists/ListCard"
import { listsUi } from "@/components/lists/lists-ui"
import { LazyCreateListModal, preloadCreateListModal } from "@/components/lists/list-modals-lazy"
import { fetchApi } from "@/lib/fetchApi"
import { ListPlus, ArrowLeft, LogIn } from "lucide-react"
import { IPlace } from "@/models/Place"
import { toast } from "sonner"

export default function ListasPageContent({
  initialLists,
}: {
  initialLists: ListWithDetails[]
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [lists, setLists] = useState<ListWithDetails[]>(initialLists)
  const [createOpen, setCreateOpen] = useState(false)
  const [favorites, setFavorites] = useState<IPlace[]>([])
  const [canUsePrivateLists, setCanUsePrivateLists] = useState(false)
  const [loadingCreate, setLoadingCreate] = useState(false)

  const fetchPublicLists = useCallback(async () => {
    try {
      const data = await fetchApi<{ lists: ListWithDetails[] }>("/api/lists?limit=20")
      setLists(data.lists ?? [])
    } catch {
      setLists(initialLists)
    }
  }, [initialLists])

  const openCreate = async () => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/listas")
      return
    }
    if (status !== "authenticated") return

    // El modal se baja mientras se piden los favoritos.
    preloadCreateListModal()
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
    <div className={listsUi.page}>
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al inicio
      </Link>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className={listsUi.kicker}>armadas por celíacos</p>
          <h1 className={listsUi.title}>Listas de la comunidad</h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#5E6A60] md:text-lg">
            Descubrí listas creadas por otros celíacos. Creá la tuya y
            compartila.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          disabled={status === "loading" || loadingCreate}
          className={listsUi.primary}
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
        </button>
      </div>

      {lists.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-[#2D4A34]/20 bg-white/60 px-5 py-12 text-center text-base text-[#5E6A60]">
          <p>Todavía no hay listas públicas.</p>
          <button
            type="button"
            onClick={openCreate}
            disabled={status === "loading" || loadingCreate}
            className={`${listsUi.primary} mt-5`}
          >
            <ListPlus className="h-4 w-4" />
            Crear la primera lista
          </button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map((list) => (
            <ListCard key={list._id} list={list} />
          ))}
        </div>
      )}

      <LazyCreateListModal
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
