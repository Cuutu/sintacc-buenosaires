"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { VentureReviewForm } from "@/components/ventures/VentureReviewForm"
import { fetchApi } from "@/lib/fetchApi"
import type { VentureReviewStats } from "@/lib/venture-review-stats"
import { Star } from "lucide-react"

type ReviewUser = { name?: string; image?: string }
type VentureReviewItem = {
  _id: string
  rating: number
  comment: string
  pinned?: boolean
  createdAt: string
  userId?: ReviewUser
}

type VentureReviewsSectionProps = {
  ventureId: string
  initialStats?: VentureReviewStats
}

export function VentureReviewsSection({
  ventureId,
  initialStats,
}: VentureReviewsSectionProps) {
  const [reviews, setReviews] = useState<VentureReviewItem[]>([])
  const [stats, setStats] = useState<VentureReviewStats>(
    initialStats ?? { avgRating: 0, totalReviews: 0 }
  )
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [sort, setSort] = useState<"recent" | "rating">("recent")
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const fetchReviews = useCallback(
    async (pageNum = 1, append = false) => {
      if (pageNum === 1) setLoading(true)
      else setLoadingMore(true)
      try {
        const data = await fetchApi<{
          reviews: VentureReviewItem[]
          stats?: VentureReviewStats
          pagination: { page: number; pages: number; total: number }
        }>(`/api/venture-reviews?ventureId=${ventureId}&page=${pageNum}&limit=10`)

        const list = data.reviews ?? []
        setReviews((prev) => (append ? [...prev, ...list] : list))
        setPage(pageNum)
        setHasMore((data.pagination?.page ?? 1) < (data.pagination?.pages ?? 1))
        if (data.stats) setStats(data.stats)
      } catch {
        if (!append) setReviews([])
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [ventureId]
  )

  useEffect(() => {
    fetchReviews(1, false)
  }, [fetchReviews])

  useEffect(() => {
    if (initialStats?.totalReviews) {
      setStats(initialStats)
    }
  }, [initialStats])

  const displayed = useMemo(() => {
    const sorted = [...reviews]
    if (sort === "rating") {
      sorted.sort((a, b) => b.rating - a.rating || +new Date(b.createdAt) - +new Date(a.createdAt))
    }
    return sorted
  }, [reviews, sort])

  const avgRating = stats.totalReviews > 0 ? stats.avgRating : 0

  const handleSuccess = () => {
    setShowForm(false)
    fetchReviews(1, false)
  }

  if (loading) {
    return (
      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-6 animate-pulse h-32" />
    )
  }

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-6 md:p-8 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold flex items-center gap-2">
          Experiencias de la comunidad
          {stats.totalReviews > 0 && (
            <span className="text-[10px] font-mono text-muted-foreground bg-white/5 border border-white/8 px-2 py-0.5 rounded">
              {stats.totalReviews}
            </span>
          )}
        </h2>
        {!showForm && (
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-8 border-primary/25 text-primary"
            onClick={() => setShowForm(true)}
          >
            + Escribir reseña
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground -mt-2">
        Opiniones de quienes compraron. Celimap no certifica; verificá siempre antes de consumir.
      </p>

      {stats.totalReviews > 0 && !showForm && (
        <div className="flex items-center gap-4 p-4 rounded-xl border border-white/8 bg-white/[0.02]">
          <div className="text-center">
            <p className="text-3xl font-extrabold leading-none">{avgRating.toFixed(1)}</p>
            <div className="flex justify-center gap-0.5 my-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  className={`h-3 w-3 ${
                    i <= Math.round(avgRating)
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground/20"
                  }`}
                />
              ))}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Promedio de <strong className="text-foreground">{stats.totalReviews}</strong>{" "}
            {stats.totalReviews === 1 ? "reseña" : "reseñas"}
          </p>
        </div>
      )}

      {reviews.length > 1 && !showForm && (
        <div className="flex gap-2">
          {(["recent", "rating"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSort(s)}
              className={`text-[10px] font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                sort === s
                  ? "border-primary/30 bg-primary/8 text-primary"
                  : "border-white/8 text-muted-foreground"
              }`}
            >
              {s === "recent" ? "Más recientes" : "Mejor valorados"}
            </button>
          ))}
        </div>
      )}

      {showForm && (
        <div>
          <Button variant="ghost" size="sm" className="mb-3" onClick={() => setShowForm(false)}>
            ← Volver
          </Button>
          <VentureReviewForm ventureId={ventureId} onSuccess={handleSuccess} />
        </div>
      )}

      {!showForm && reviews.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm mb-3">Todavía no hay reseñas.</p>
          <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
            Sé el primero en opinar
          </Button>
        </div>
      )}

      {!showForm &&
        displayed.map((review) => (
          <div
            key={review._id}
            className={`rounded-xl border p-4 ${
              review.pinned
                ? "border-primary/20 bg-primary/[0.03]"
                : "border-white/7 bg-white/[0.015]"
            }`}
          >
            <div className="flex items-start gap-3 mb-2">
              {review.userId?.image ? (
                <Image
                  src={review.userId.image}
                  alt=""
                  width={32}
                  height={32}
                  className="rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center text-xs font-bold shrink-0">
                  {(review.userId?.name || "U")[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold truncate">
                    {review.userId?.name || "Usuario"}
                  </p>
                  <div className="flex gap-0.5 shrink-0">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        className={`h-3 w-3 ${
                          i <= review.rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground/15"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(review.createdAt).toLocaleDateString("es-AR", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{review.comment}</p>
          </div>
        ))}

      {!showForm && hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={loadingMore}
            onClick={() => fetchReviews(page + 1, true)}
          >
            {loadingMore ? "Cargando..." : "Ver más reseñas"}
          </Button>
        </div>
      )}
    </section>
  )
}
