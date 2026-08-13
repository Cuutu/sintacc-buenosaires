"use client"

import { useEffect, useState, useCallback, useRef, useMemo } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ListPlaceCard } from "@/components/lists/ListPlaceCard"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CreateListModal } from "@/components/lists/CreateListModal"
import { ManageListModal } from "@/components/lists/ManageListModal"
import { OwnerListCard } from "@/components/lists/OwnerListCard"
import type { ListWithDetails } from "@/components/lists/ListCard"
import { IPlace } from "@/models/Place"
import { fetchApi } from "@/lib/fetchApi"
import { resolveFavoritosAuthView } from "@/lib/favoritos-auth-view"
import { toast } from "sonner"
import { ListPlus } from "lucide-react"
import { LIST_VISIBILITY } from "@/lib/lists/constants"
import { cn } from "@/lib/utils"

type ListFilter = "all" | "public" | "private"
type ConfirmKind = "delete" | "regenerate" | "revoke" | null

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
  const [listsFetched, setListsFetched] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [manageList, setManageList] = useState<ListWithDetails | null>(null)
  const [listFilter, setListFilter] = useState<ListFilter>("all")
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
      setListsFetched(true)
    } catch (error: any) {
      toast.error(error?.message || "Error al cargar listas")
    } finally {
      setListsLoading(false)
    }
  }, [])

  const filteredLists = useMemo(() => {
    if (listFilter === "public") {
      return lists.filter(
        (l) =>
          l.visibility === LIST_VISIBILITY.PUBLIC ||
          (l.isPublic && l.visibility !== LIST_VISIBILITY.PRIVATE_LINK)
      )
    }
    if (listFilter === "private") {
      return lists.filter(
        (l) =>
          l.visibility === LIST_VISIBILITY.PRIVATE_LINK || l.isPublic === false
      )
    }
    return lists
  }, [lists, listFilter])

  const copyPrivateLink = async (list: ListWithDetails) => {
    if (!list.privateSharePath) {
      toast.error("Sin enlace activo")
      return
    }
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}${list.privateSharePath}`
      )
      toast.success("Enlace copiado")
    } catch {
      toast.error("No se pudo copiar el enlace")
    }
  }

  const openPreview = (list: ListWithDetails) => {
    const isPrivate =
      list.visibility === LIST_VISIBILITY.PRIVATE_LINK || list.isPublic === false
    if (isPrivate) {
      if (!list.privateSharePath) {
        toast.error("Sin enlace activo")
        return
      }
      window.open(list.privateSharePath, "_blank", "noopener,noreferrer")
      return
    }
    window.open(`/listas/${list._id}`, "_blank", "noopener,noreferrer")
  }

  const runLinkAction = async (
    list: ListWithDetails,
    action: "regenerate" | "revoke" | "enable"
  ) => {
    setActionLoading(true)
    try {
      await fetchApi(`/api/lists/${list._id}/private-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      toast.success(
        action === "regenerate"
          ? "Enlace regenerado"
          : action === "revoke"
            ? "Acceso revocado"
            : "Acceso reactivado"
      )
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
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">Guardados</h1>
        <Button
          type="button"
          className="h-10 shrink-0 gap-1.5"
          onClick={() => setCreateModalOpen(true)}
        >
          <ListPlus className="h-4 w-4" />
          <span className="hidden sm:inline">Nueva lista</span>
          <span className="sm:hidden">Nueva</span>
        </Button>
      </div>

      <Tabs
        defaultValue="favoritos"
        className="space-y-6"
        onValueChange={(v) => {
          if (v === "listas" && !listsFetched) fetchLists()
        }}
      >
        <TabsList className="grid h-11 w-full max-w-md grid-cols-2 rounded-xl border border-white/10 bg-white/[0.03] p-1">
          <TabsTrigger
            value="favoritos"
            className={cn(
              "rounded-lg data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-none",
              "data-[state=inactive]:text-white/50"
            )}
          >
            Favoritos{!loading ? ` ${favorites.length}` : ""}
          </TabsTrigger>
          <TabsTrigger
            value="listas"
            className={cn(
              "rounded-lg data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-none",
              "data-[state=inactive]:text-white/50"
            )}
          >
            Mis listas{listsFetched ? ` ${lists.length}` : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="favoritos">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 animate-pulse rounded-2xl bg-muted/40" />
              ))}
            </div>
          ) : favorites.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Todavía no guardaste ningún lugar. Cuando le des Guardar a un
                lugar en su página de detalle, aparecerá acá.
              </CardContent>
            </Card>
          ) : (
            <div className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {favorites.map((place) => (
                <ListPlaceCard key={place._id.toString()} place={place} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="listas" className="space-y-4">
          {listsFetched && lists.length > 0 ? (
            <div className="flex flex-wrap gap-2">
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
                  onClick={() => setListFilter(key)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                    listFilter === key
                      ? "border-primary/40 bg-primary/15 text-primary"
                      : "border-white/10 text-white/55 hover:text-white/80"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}

          {listsLoading && !listsFetched ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-[280px] animate-pulse rounded-2xl bg-muted/40" />
              ))}
            </div>
          ) : filteredLists.length === 0 ? (
            <Card>
              <CardContent className="space-y-4 py-10 text-center text-muted-foreground">
                <p>
                  {lists.length === 0
                    ? "No tenés listas todavía."
                    : "No hay listas en este filtro."}
                </p>
                {lists.length === 0 ? (
                  <Button
                    onClick={() => setCreateModalOpen(true)}
                    className="gap-2"
                  >
                    <ListPlus className="h-4 w-4" />
                    Crear mi primera lista
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredLists.map((list) => (
                <OwnerListCard
                  key={list._id}
                  list={list}
                  onManage={() => setManageList(list)}
                  onCopyLink={() => copyPrivateLink(list)}
                  onPreview={() => openPreview(list)}
                  onDuplicate={() => duplicateList(list)}
                  onRegenerate={() => {
                    setConfirmList(list)
                    setConfirmKind("regenerate")
                  }}
                  onRevoke={() => {
                    setConfirmList(list)
                    setConfirmKind("revoke")
                  }}
                  onEnable={() => runLinkAction(list, "enable")}
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

      <CreateListModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        favorites={favorites}
        canUsePrivateLists={canUsePrivateLists}
        onCreated={() => {
          setListsFetched(false)
          fetchLists()
        }}
      />

      <ManageListModal
        open={Boolean(manageList)}
        onOpenChange={(open) => !open && setManageList(null)}
        list={manageList}
        favorites={favorites}
        canUsePrivateLists={canUsePrivateLists}
        onUpdated={fetchLists}
      />

      <Dialog
        open={confirmKind !== null}
        onOpenChange={(v) => {
          if (!v) {
            setConfirmKind(null)
            setConfirmList(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmKind === "delete"
                ? "¿Eliminar lista?"
                : confirmKind === "regenerate"
                  ? "¿Regenerar enlace?"
                  : "¿Revocar acceso?"}
            </DialogTitle>
            <DialogDescription>
              {confirmKind === "delete" ? (
                <>
                  Se eliminará{" "}
                  <span className="font-medium text-foreground">
                    {confirmList?.name}
                  </span>
                  . Esta acción no se puede deshacer.
                </>
              ) : confirmKind === "regenerate" ? (
                "El enlace anterior dejará de funcionar de inmediato. Tendrás que compartir el nuevo."
              ) : (
                "Quienes tengan el enlace ya no podrán ver la lista. Podés reactivarlo después."
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmKind(null)
                setConfirmList(null)
              }}
            >
              Cancelar
            </Button>
            <Button
              variant={confirmKind === "delete" || confirmKind === "revoke" ? "destructive" : "default"}
              disabled={actionLoading || !confirmList}
              onClick={() => {
                if (!confirmList || !confirmKind) return
                if (confirmKind === "delete") deleteList(confirmList)
                else if (confirmKind === "regenerate")
                  runLinkAction(confirmList, "regenerate")
                else runLinkAction(confirmList, "revoke")
              }}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
