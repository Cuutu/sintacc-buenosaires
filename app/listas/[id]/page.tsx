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
        <div className="py-12 text-center text-white/60">
          {loading ? "Cargando..." : "Lista no encontrada"}
        </div>
      </div>
    )
  }

  const places = (list.placeIds ?? []) as IPlace[]
  const placesLabel = `${places.length} lugar${places.length !== 1 ? "es" : ""}`

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6 md:py-8">
      <Link
        href={session ? "/favoritos" : "/listas"}
        className="mb-5 inline-flex items-center gap-2 text-sm text-white/55 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {session ? "Volver a guardados" : "Volver a listas"}
      </Link>

      <header className="mb-6 rounded-2xl border border-white/10 bg-[#0c100e]/80 p-4 md:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-white md:text-[1.75rem]">
              {list.name}
            </h1>

            {list.description ? (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/65">
                {list.description}
              </p>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-white/70">
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
                  <User className="h-4 w-4 shrink-0 text-white/50" aria-hidden />
                )}
                <span className="font-medium text-white/80">
                  {list.createdBy?.name ?? "Usuario"}
                </span>
              </span>
              <span className="text-white/25" aria-hidden>
                ·
              </span>
              <span>{placesLabel}</span>
              <span className="text-white/25" aria-hidden>
                ·
              </span>
              <span className="inline-flex items-center gap-1">
                <Heart className="h-3.5 w-3.5 text-primary/80" aria-hidden />
                {list.likesCount} like{list.likesCount !== 1 ? "s" : ""}
              </span>
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
        <div className="rounded-2xl border border-white/10 bg-[#0c100e] px-4 py-10 text-center text-sm text-white/55">
          Esta lista no tiene lugares todavía.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {places.map((place) => (
            <ListPlaceCard key={place._id.toString()} place={place} />
          ))}
        </div>
      )}
    </div>
  )
}
