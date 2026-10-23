"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"
import { RepeatedNamesProvider } from "@/components/places/BranchName"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { CalendarDays, Copy, Globe, Heart, Link2, Lock, MapPin, Settings2, User } from "lucide-react"
import { toast } from "sonner"
import { fetchApi } from "@/lib/fetchApi"
import { IPlace } from "@/models/Place"
import type { ListWithDetails } from "@/components/lists/ListCard"
import { SavedPlaceCard } from "@/components/lists/SavedPlaceCard"
import { listsUi } from "@/components/lists/lists-ui"
import { LazyManageListModal, preloadManageListModal } from "@/components/lists/list-modals-lazy"
import { Breadcrumbs } from "@/components/seo/Breadcrumbs"
import { formatPlacesCount, listPlacesCount } from "@/lib/lists/card-places"
import { LIST_SHARE_LABELS, listShareState, listShareUrl, type ListShareState } from "@/lib/lists/share-state"
import { ownerIdEquals } from "@/lib/lists/access"
import { cn } from "@/lib/utils"
import { trackEvent } from "@/lib/analytics"

const SHARE_ICONS: Record<ListShareState, typeof Globe> = { public: Globe, link: Link2, private: Lock }

/** Datos de la lista: cada uno con su ícono y sin "·", así nunca queda un separador colgando al final del renglón. */
function MetaItem({ icon: Icon, children }: { icon: typeof Globe; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <Icon className="h-4 w-4 shrink-0 text-[#5E6A60]" aria-hidden />
      {children}
    </span>
  )
}

export default function ListaDetailPage() {
  const params = useParams()
  const id = params.id as string
  const { data: session } = useSession()
  const [list, setList] = useState<ListWithDetails | null>(null)
  const [liked, setLiked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [likeLoading, setLikeLoading] = useState(false)
  const [manageOpen, setManageOpen] = useState(false)
  const [manageLoading, setManageLoading] = useState(false)
  const [favorites, setFavorites] = useState<IPlace[]>([])
  const [canUsePrivateLists, setCanUsePrivateLists] = useState(false)

  const fetchList = useCallback(async () => {
    try {
      const data = await fetchApi<ListWithDetails>(`/api/lists/${id}`)
      setList(data)
    } catch (error: any) {
      toast.error(error?.message || "Lista no encontrada")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (!id) return
    fetchList()
  }, [id, fetchList])

  useEffect(() => {
    if (!list) return
    trackEvent("list_open", { listId: id, visibility: listShareState(list) === "public" ? "public" : "private" })
    // Solo la primera carga de cada lista.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list?._id, id])

  const isOwner = Boolean(list && ownerIdEquals(list.createdBy, session?.user?.id))

  useEffect(() => {
    if (!id || !session || isOwner) return
    fetchApi<{ liked: boolean }>(`/api/lists/${id}/liked`)
      .then((res) => setLiked(res.liked))
      .catch(() => {})
  }, [id, session, isOwner])

  const handleLike = async () => {
    if (!session) {
      toast.error("Iniciá sesión para dar me gusta")
      return
    }
    setLikeLoading(true)
    try {
      const res = await fetchApi<{ liked: boolean; likesCount: number }>(`/api/lists/${id}/like`, { method: "POST" })
      setLiked(res.liked)
      if (list) setList({ ...list, likesCount: res.likesCount })
    } catch (error: any) {
      toast.error(error?.message || "No se pudo guardar el me gusta")
    } finally {
      setLikeLoading(false)
    }
  }

  const copyLink = async () => {
    if (!list) return
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

  /** "Gestionar" necesita los favoritos (para sumar lugares) y si puede hacer listas privadas. */
  const openManage = async () => {
    preloadManageListModal()
    setManageLoading(true)
    try {
      const [favData, mineData] = await Promise.all([
        fetchApi<{ favorites: Array<{ placeId: IPlace | null }> }>("/api/favorites").catch(() => ({ favorites: [] })),
        fetchApi<{ canUsePrivateLists?: boolean }>("/api/lists?mine=1").catch(() => ({ canUsePrivateLists: false })),
      ])
      setFavorites(
        (favData.favorites ?? [])
          .map((f) => f.placeId)
          .filter((p): p is IPlace => Boolean(p && p._id && p.name))
      )
      setCanUsePrivateLists(Boolean(mineData.canUsePrivateLists))
      setManageOpen(true)
    } finally {
      setManageLoading(false)
    }
  }

  if (loading || !list) {
    return (
      <div className={listsUi.page}>
        {loading ? (
          <div className="animate-pulse space-y-4" aria-label="Cargando lista">
            <div className="h-5 w-40 rounded bg-[#2D4A34]/10" />
            <div className="h-12 w-72 max-w-full rounded-xl bg-[#2D4A34]/10" />
            <div className="grid gap-5 pt-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-[260px] rounded-[26px] bg-[#2D4A34]/5" />
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-[22px] border border-dashed border-[#2D4A34]/20 bg-white/60 px-5 py-12 text-center text-base text-[#5E6A60]">
            <p>No encontramos esta lista.</p>
            <Link href="/listas" className={cn(listsUi.secondary, "mt-5")}>
              Ver las listas de la comunidad
            </Link>
          </div>
        )}
      </div>
    )
  }

  const places = (list.placeIds ?? []).filter(Boolean) as IPlace[]
  const count = listPlacesCount(list)
  const author = list.createdBy?.name?.trim() || "Usuario"
  const share = listShareState(list)
  const ShareIcon = SHARE_ICONS[share]
  const updatedLabel = list.updatedAt
    ? new Intl.DateTimeFormat("es-AR", { year: "numeric", month: "long", day: "numeric" }).format(
        new Date(list.updatedAt)
      )
    : null

  return (
    <div className={listsUi.page}>
      <Breadcrumbs items={[{ label: "Listas", href: "/listas" }, { label: list.name }]} />

      {/* Sin caja: frase en cursiva, título grande y una fila de datos (revisión 23/10). */}
      <header className="mb-8 mt-5">
        <p className={listsUi.kicker}>una lista de {author}</p>
        <h1 className={listsUi.title}>{list.name}</h1>
        {list.description ? (
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#5E6A60] md:text-lg">{list.description}</p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-bold text-[#2D4A34]">
          <span className="inline-flex h-7 items-center gap-1 rounded-full bg-[#E3EEE5] px-2.5 text-xs font-extrabold text-[#1F4D35]">
            <ShareIcon className="h-3 w-3" strokeWidth={2.6} aria-hidden />
            {share === "public" ? "Lista pública" : LIST_SHARE_LABELS[share]}
          </span>
          {list.destination ? (
            <span className="inline-flex h-7 items-center gap-1 rounded-full bg-[#F1ECE2] px-2.5 text-xs font-extrabold text-[#2D4A34]">
              <MapPin className="h-3 w-3" strokeWidth={2.6} aria-hidden />
              {list.destination}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            {list.createdBy?.image ? (
              <Image src={list.createdBy.image} alt="" width={20} height={20} className="h-5 w-5 rounded-full object-cover" />
            ) : (
              <User className="h-4 w-4 text-[#5E6A60]" aria-hidden />
            )}
            {author}
          </span>
          <MetaItem icon={MapPin}>{formatPlacesCount(count)}</MetaItem>
          {share === "public" ? (
            <MetaItem icon={Heart}>
              {list.likesCount} me gusta
            </MetaItem>
          ) : null}
          {updatedLabel ? <MetaItem icon={CalendarDays}>Actualizada el {updatedLabel}</MetaItem> : null}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {isOwner ? (
            <>
              <button
                type="button"
                className={listsUi.primary}
                onClick={openManage}
                onPointerEnter={preloadManageListModal}
                disabled={manageLoading}
              >
                <Settings2 className="h-4 w-4" aria-hidden />
                {manageLoading ? "Abriendo..." : "Gestionar"}
              </button>
              <button type="button" className={listsUi.secondary} onClick={copyLink} disabled={share === "private"}>
                <Copy className="h-4 w-4" aria-hidden />
                Copiar enlace
              </button>
            </>
          ) : session ? (
            <button
              type="button"
              className={cn(listsUi.secondary, liked && "border-[#B84420]/40 text-[#9A3A1B]")}
              onClick={handleLike}
              disabled={likeLoading}
              aria-pressed={liked}
            >
              <Heart className={cn("h-4 w-4", liked && "fill-[#B84420] text-[#B84420]")} aria-hidden />
              {liked ? "Te gusta" : "Me gusta"}
            </button>
          ) : null}
        </div>
      </header>

      {places.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-[#2D4A34]/20 bg-white/60 px-5 py-10 text-center text-base text-[#5E6A60]">
          Esta lista no tiene lugares todavía.
        </div>
      ) : (
        // Tres columnas como máximo: con cuatro, "Ver en mapa" se partía.
        <RepeatedNamesProvider names={places.map((place) => place.name)}>
          <ul className="grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {places.map((place) => (
              <li key={place._id.toString()}>
                <SavedPlaceCard place={place} />
              </li>
            ))}
          </ul>
        </RepeatedNamesProvider>
      )}

      {isOwner ? (
        <LazyManageListModal
          open={manageOpen}
          onOpenChange={setManageOpen}
          list={list}
          favorites={favorites}
          canUsePrivateLists={canUsePrivateLists}
          onUpdated={fetchList}
        />
      ) : null}
    </div>
  )
}
