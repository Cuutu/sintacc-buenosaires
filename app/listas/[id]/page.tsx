"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ListPlaceCard } from "@/components/lists/ListPlaceCard"
import { fetchApi } from "@/lib/fetchApi"
import { toast } from "sonner"
import { Heart, User, ArrowLeft } from "lucide-react"
import { IPlace } from "@/models/Place"
import type { ListWithDetails } from "@/components/lists/ListCard"
import { cn } from "@/lib/utils"
import { trackEvent } from "@/lib/analytics"

export default function ListaDetailPage() {
  const params = useParams()
  const id = params.id as string
  const { data: session } = useSession()
  const [list, setList] = useState<ListWithDetails | null>(null)
  const [liked, setLiked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [likeLoading, setLikeLoading] = useState(false)

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
    const visibility =
      list.visibility === "PRIVATE_LINK" || list.isPublic === false ? "private" : "public"
    trackEvent("list_open", { listId: id, visibility })
  }, [list, id])

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
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="py-12 text-center text-muted-foreground">
          {loading ? "Cargando..." : "Lista no encontrada"}
        </div>
      </div>
    )
  }

  const places = (list.placeIds ?? []) as IPlace[]
  const placesLabel = `${places.length} lugar${places.length !== 1 ? "es" : ""}`
  const isPublicList =
    list.visibility !== "PRIVATE_LINK" && list.isPublic !== false
  const updatedLabel = list.updatedAt
    ? new Intl.DateTimeFormat("es-AR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(new Date(list.updatedAt))
    : null

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6 md:py-8">
      <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-olive">
          Inicio
        </Link>
        <span aria-hidden>/</span>
        <Link href="/listas" className="hover:text-olive">
          Listas
        </Link>
        <span aria-hidden>/</span>
        <span className="text-olive/80">{list.name}</span>
      </nav>

      <Link
        href={session ? "/favoritos" : "/listas"}
        className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-olive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {session ? "Volver a guardados" : "Volver a listas"}
      </Link>

      <header className="mb-6 rounded-2xl border border-olive/10 bg-card/80 p-4 md:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "rounded-md px-2 py-0.5 text-xs font-medium",
                  isPublicList
                    ? "bg-primary/15 text-primary"
                    : "bg-olive/10 text-muted-foreground"
                )}
              >
                {isPublicList ? "Lista pública" : "Lista privada (accesible con enlace)"}
              </span>
              {list.destination ? (
                <span className="text-xs text-muted-foreground">{list.destination}</span>
              ) : null}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-olive md:text-[1.75rem]">
              {list.name}
            </h1>

            {list.description ? (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {list.description}
              </p>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                {list.createdBy?.image ? (
                  <Image
                    src={list.createdBy.image}
                    alt=""
                    width={22}
                    height={22}
                    className="h-[22px] w-[22px] shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <User className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                )}
                <span className="font-medium text-olive/80">
                  {list.createdBy?.name ?? "Usuario"}
                </span>
              </span>
              <span className="text-olive/25" aria-hidden>
                ·
              </span>
              <span>{placesLabel}</span>
              <span className="text-olive/25" aria-hidden>
                ·
              </span>
              <span className="inline-flex items-center gap-1">
                <Heart className="h-3.5 w-3.5 text-primary/80" aria-hidden />
                {list.likesCount} like{list.likesCount !== 1 ? "s" : ""}
              </span>
              {updatedLabel ? (
                <>
                  <span className="text-olive/25" aria-hidden>
                    ·
                  </span>
                  <span className="text-muted-foreground">Actualizada {updatedLabel}</span>
                </>
              ) : null}
            </div>
          </div>

          {session && (
            <Button
              variant={liked ? "default" : "outline"}
              onClick={handleLike}
              disabled={likeLoading}
              aria-pressed={liked}
              className={cn(
                "h-10 w-full shrink-0 gap-2 sm:mt-0.5 sm:w-auto",
                liked && "motion-safe:animate-none"
              )}
            >
              <Heart
                className={cn(
                  "h-4 w-4 transition-transform",
                  liked && "fill-current",
                  likeLoading && "opacity-70",
                  !likeLoading && liked && "motion-safe:scale-110"
                )}
                aria-hidden
              />
              {liked ? "Te gusta" : "Me gusta"}
            </Button>
          )}
        </div>
      </header>

      {places.length === 0 ? (
        <div className="rounded-2xl border border-olive/10 bg-card px-4 py-10 text-center text-sm text-muted-foreground">
          Esta lista no tiene lugares todavía.
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {places.map((place) => (
            <ListPlaceCard key={place._id.toString()} place={place} />
          ))}
        </div>
      )}
    </div>
  )
}
