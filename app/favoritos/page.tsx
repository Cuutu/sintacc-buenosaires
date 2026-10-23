"use client"

import { useEffect, useState, useCallback, useRef, useMemo } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import Link from "next/link"
import { SavedPlaceCard } from "@/components/lists/SavedPlaceCard"
import { RepeatedNamesProvider } from "@/components/places/BranchName"
import { listsPill, listsUi } from "@/components/lists/lists-ui"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  LazyCreateListModal,
  LazyManageListModal,
  preloadCreateListModal,
} from "@/components/lists/list-modals-lazy"
import type { ListWithDetails } from "@/components/lists/ListCard"
import { IPlace } from "@/models/Place"
import { fetchApi } from "@/lib/fetchApi"
import { resolveFavoritosAuthView } from "@/lib/favoritos-auth-view"
import { toast } from "sonner"
import { ArrowRight, ListPlus } from "lucide-react"
import { listShareState, listShareUrl } from "@/lib/lists/share-state"
import { cn } from "@/lib/utils"
import { guardadosTabFromSearch, type GuardadosTab } from "@/lib/lists/guardados-tab"

/**
 * Las tarjetas de "Mis listas" traen el menú de acciones (Radix DropdownMenu, ~20 KB
 * gzip) y solo aparecen en la segunda pestaña: se bajan al elegirla.
 */
const loadOwnerListCard = () => import("@/components/lists/OwnerListCard")
const OwnerListCard = dynamic(() => loadOwnerListCard().then((m) => m.OwnerListCard), {
  loading: () => <div className="h-[268px] animate-pulse rounded-[26px] bg-[#2D4A34]/5" aria-hidden />,
})

/** La confirmación de Eliminar / Regenerar (diálogo de Radix, ~12 KB) también se baja al usarla. */
const loadConfirmDialog = () => import("@/components/lists/ListConfirmDialog")
const ListConfirmDialog = dynamic(() => loadConfirmDialog().then((m) => m.ListConfirmDialog), { ssr: false })

function preloadOwnerListCard() {
  void loadOwnerListCard().catch(() => undefined)
  void loadConfirmDialog().catch(() => undefined)
}

type ListFilter = "all" | "public" | "private"

type ConfirmKind = "delete" | "regenerate" | null

function FavoritosSkeleton({ state }: { state: string }) {
  return (
    <div className={listsUi.page} data-auth-state={state}>
      <div className="animate-pulse space-y-4">
        <div className="h-12 w-56 rounded-xl bg-[#2D4A34]/10" />
        <div className="h-40 rounded-[26px] bg-[#2D4A34]/5" />
      </div>
    </div>
  )
}

/** Caja para los estados vacíos y de error. */
function EmptyBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[22px] border border-dashed border-[#2D4A34]/20 bg-white/60 px-5 py-10 text-center text-base text-[#5E6A60]">
      {children}
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
  const [listsFetched, setListsFetched] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [manageList, setManageList] = useState<ListWithDetails | null>(null)
  const [listFilter, setListFilter] = useState<ListFilter>("all")
  const [tab, setTab] = useState<GuardadosTab>("favoritos")
  const [confirmKind, setConfirmKind] = useState<ConfirmKind>(null)
  const [confirmList, setConfirmList] = useState<ListWithDetails | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [sessionHttpStatus, setSessionHttpStatus] = useState<number | null>(null)

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
      router.replace("/login?callbackUrl=%2Ffavoritos")
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
      setListsFetched(true)
    } catch (error: any) {
      toast.error(error?.message || "Error al cargar listas")
    } finally {
      setListsLoading(false)
    }
  }, [])

  // La pestaña sale de la URL al montar (sin useSearchParams: obligaría a un Suspense).
  useEffect(() => {
    setTab(guardadosTabFromSearch(window.location.search))
  }, [])

  useEffect(() => {
    if (tab !== "listas" || authView.kind !== "ready") return
    preloadOwnerListCard()
    if (!listsFetched && !listsLoading) fetchLists()
  }, [tab, authView.kind, listsFetched, listsLoading, fetchLists])

  const changeTab = (value: string) => {
    const next: GuardadosTab = value === "listas" ? "listas" : "favoritos"
    setTab(next)
    // La URL recuerda la pestaña: al volver de una lista, sigue en "Mis listas".
    const url = new URL(window.location.href)
    if (next === "listas") url.searchParams.set("tab", "listas")
    else url.searchParams.delete("tab")
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash)
  }

  const filteredLists = useMemo(() => {
    // "Privadas" junta las que van con enlace y las que solo ve la dueña.
    if (listFilter === "public") return lists.filter((l) => listShareState(l) === "public")
    if (listFilter === "private") return lists.filter((l) => listShareState(l) !== "public")
    return lists
  }, [lists, listFilter])

  /** También en las públicas (antes solo en las privadas). */
  const copyListLink = async (list: ListWithDetails) => {
    const url = listShareUrl(list, window.location.origin)
    if (!url) {
      toast.error("Las listas privadas no tienen enlace")
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      toast.success("Enlace copiado")
    } catch {
      toast.error("No se pudo copiar el enlace")
    }
  }

  const openPreview = (list: ListWithDetails) => {
    // Con enlace: la vista de quien recibe el enlace. Pública o privada: la página de la lista.
    const target =
      listShareState(list) === "link" && list.privateSharePath ? list.privateSharePath : `/listas/${list._id}`
    window.open(target, "_blank", "noopener,noreferrer")
  }

  const runLinkAction = async (list: ListWithDetails, action: "regenerate") => {
    setActionLoading(true)
    try {
      await fetchApi(`/api/lists/${list._id}/private-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      toast.success(action === "regenerate" ? "Enlace regenerado" : "Listo")
      setConfirmKind(null)
      setConfirmList(null)
      fetchLists()
    } catch (err: any) {
      toast.error(err?.message || "Error al actualizar enlace")
    } finally {
      setActionLoading(false)
    }
  }

  const duplicateList = async (list: ListWithDetails) => {
    try {
      await fetchApi(`/api/lists/${list._id}/duplicate`, { method: "POST" })
      toast.success("Lista duplicada")
      fetchLists()
    } catch (err: any) {
      toast.error(err?.message || "Error al duplicar")
    }
  }

  const deleteList = async (list: ListWithDetails) => {
    setActionLoading(true)
    try {
      await fetchApi(`/api/lists/${list._id}`, { method: "DELETE" })
      toast.success("Lista eliminada")
      setConfirmKind(null)
      setConfirmList(null)
      fetchLists()
    } catch (err: any) {
      toast.error(err?.message || "Error al eliminar")
    } finally {
      setActionLoading(false)
    }
  }

  if (authView.kind === "loading" || authView.kind === "unauthenticated") {
    return <FavoritosSkeleton state={authView.kind} />
  }

  if (authView.kind === "session_error") {
    return (
      <div className={listsUi.page} data-auth-state="session_error">
        <EmptyBox>
          <p>{authView.message}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button type="button" className={listsUi.primary} onClick={() => window.location.reload()}>
              Reintentar
            </button>
            <Link href="/" className={listsUi.secondary}>
              Ir al inicio
            </Link>
          </div>
        </EmptyBox>
      </div>
    )
  }

  if (loadError && !loading && favorites.length === 0) {
    return (
      <div className={listsUi.page} data-auth-state="load_error">
        <p className={listsUi.kicker}>tus lugares y tus listas</p>
        <h1 className={cn(listsUi.title, "mb-6")}>Guardados</h1>
        <EmptyBox>
          <p>{loadError}</p>
          <button type="button" className={cn(listsUi.primary, "mt-5")} onClick={() => fetchFavorites()}>
            Reintentar
          </button>
        </EmptyBox>
      </div>
    )
  }

  const newListButton = (
    <button
      type="button"
      className={listsUi.primary}
      onClick={() => {
        // Desde la pestaña Favoritos todavía no se pidió si puede hacer listas privadas:
        // sin esto, el modal no mostraba la visibilidad.
        if (!listsFetched && !listsLoading) fetchLists()
        setCreateModalOpen(true)
      }}
      onPointerEnter={preloadCreateListModal}
      onPointerDown={preloadCreateListModal}
      onFocus={preloadCreateListModal}
    >
      <ListPlus className="h-4 w-4" aria-hidden />
      Nueva lista
    </button>
  )

  return (
    <div className={listsUi.page} data-auth-state="ready">
      <div className="mb-6 flex items-end justify-between gap-3 md:mb-8">
        <div className="min-w-0">
          <p className={listsUi.kicker}>tus lugares y tus listas</p>
          <h1 className={listsUi.title}>Guardados</h1>
        </div>
        {newListButton}
      </div>

      <Tabs
        value={tab}
        className="space-y-6"
        onValueChange={changeTab}
      >
        {/* Píldoras como los filtros de /emprendimientos: la elegida en verde oscuro. */}
        <TabsList className="h-auto justify-start gap-2 rounded-none bg-transparent p-0">
          <TabsTrigger
            value="favoritos"
            className={cn(listsPill(false), "data-[state=active]:border-[#1F4D35] data-[state=active]:bg-[#1F4D35] data-[state=active]:text-[#F8F5EF] data-[state=active]:shadow-none")}
          >
            Favoritos{!loading ? ` ${favorites.length}` : ""}
          </TabsTrigger>
          <TabsTrigger
            value="listas"
            onPointerEnter={preloadOwnerListCard}
            className={cn(listsPill(false), "data-[state=active]:border-[#1F4D35] data-[state=active]:bg-[#1F4D35] data-[state=active]:text-[#F8F5EF] data-[state=active]:shadow-none")}
          >
            Mis listas{listsFetched ? ` ${lists.length}` : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="favoritos" className="mt-0">
          <RepeatedNamesProvider names={favorites.map((place) => place.name)}>
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-[100px] animate-pulse rounded-[20px] bg-[#2D4A34]/5 sm:h-[260px] sm:rounded-[26px]" />
              ))}
            </div>
          ) : favorites.length === 0 ? (
            <EmptyBox>
              Todavía no guardaste ningún lugar. Tocá el corazón en la ficha de un lugar y va a
              aparecer acá.
              <div className="mt-5">
                <Link href="/mapa" className={listsUi.secondary}>
                  Abrir el mapa
                </Link>
              </div>
            </EmptyBox>
          ) : (
            <>
              {/* Celular: filas compactas (foto chica a la izquierda). */}
              <ul className="grid gap-3 sm:hidden">
                {favorites.map((place) => (
                  <li key={place._id.toString()}>
                    <SavedPlaceCard place={place} compact />
                  </li>
                ))}
              </ul>
              <ul className="hidden items-stretch gap-5 sm:grid sm:grid-cols-2 lg:grid-cols-3">
                {favorites.map((place) => (
                  <li key={place._id.toString()}>
                    <SavedPlaceCard place={place} />
                  </li>
                ))}
              </ul>
            </>
          )}
          </RepeatedNamesProvider>
        </TabsContent>

        <TabsContent value="listas" className="mt-0 space-y-5">
          {listsFetched && lists.length > 0 ? (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar listas">
              {(
                [
                  ["all", "Todas"],
                  ["public", "Públicas"],
                  ["private", "Privadas"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={listFilter === key}
                  onClick={() => setListFilter(key)}
                  className={listsPill(listFilter === key)}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}

          {listsLoading && !listsFetched ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-[268px] animate-pulse rounded-[26px] bg-[#2D4A34]/5" />
              ))}
            </div>
          ) : filteredLists.length === 0 ? (
            <EmptyBox>
              <p>{lists.length === 0 ? "No tenés listas todavía." : "No hay listas en este filtro."}</p>
              {lists.length === 0 ? <div className="mt-5">{newListButton}</div> : null}
            </EmptyBox>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredLists.map((list) => (
                <OwnerListCard
                  key={list._id}
                  list={list}
                  onManage={() => setManageList(list)}
                  onCopyLink={() => copyListLink(list)}
                  onPreview={() => openPreview(list)}
                  onDuplicate={() => duplicateList(list)}
                  onRegenerate={() => {
                    setConfirmList(list)
                    setConfirmKind("regenerate")
                  }}
                  onDelete={() => {
                    setConfirmList(list)
                    setConfirmKind("delete")
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <p className="mt-10 border-t border-[#E2DACB] pt-4">
        <Link href="/listas" className={listsUi.link}>
          Explorar listas de la comunidad
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </p>

      <LazyCreateListModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        favorites={favorites}
        canUsePrivateLists={canUsePrivateLists}
        onCreated={() => {
          setListsFetched(false)
          fetchLists()
        }}
      />

      <LazyManageListModal
        open={Boolean(manageList)}
        onOpenChange={(open) => !open && setManageList(null)}
        list={manageList}
        favorites={favorites}
        canUsePrivateLists={canUsePrivateLists}
        onUpdated={fetchLists}
      />

      {confirmKind ? (
        <ListConfirmDialog
          kind={confirmKind}
          listName={confirmList?.name}
          loading={actionLoading || !confirmList}
          onCancel={() => {
            setConfirmKind(null)
            setConfirmList(null)
          }}
          onConfirm={() => {
            if (!confirmList) return
            if (confirmKind === "delete") deleteList(confirmList)
            else runLinkAction(confirmList, "regenerate")
          }}
        />
      ) : null}
    </div>
  )
}
