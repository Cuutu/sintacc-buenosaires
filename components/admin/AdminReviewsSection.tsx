"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import type { ReviewItem } from "@/components/admin/types"

export type AdminReviewsSectionProps = {
  reviews: ReviewItem[]
  reviewsLoading: boolean
  reviewSearch: string
  setReviewSearch: (v: string) => void
  reviewFilter: string
  setReviewFilter: (v: string) => void
  fetchReviews: (status?: string) => void
  handleReviewAction: (id: string, action: "hide" | "unhide" | "pin" | "unpin") => void
}

export function AdminReviewsSection(props: AdminReviewsSectionProps) {
const {
  reviews,
  reviewsLoading,
  reviewSearch,
  setReviewSearch,
  reviewFilter,
  setReviewFilter,
  fetchReviews,
  handleReviewAction,
} = props
  return (
  <div className="rounded-xl border border-border overflow-hidden">
    <div className="px-4 py-3 border-b border-border bg-card">
      <h2 className="text-sm font-bold">⭐ Reseñas</h2>
      <p className="text-xs text-muted-foreground mt-0.5">
        Podés ocultar reseñas inapropiadas o destacar las más útiles con 📌
      </p>
    </div>

    {/* Filtros */}
    <div className="px-4 py-2 border-b border-border bg-card/50 flex flex-wrap gap-2 items-center">
      <div className="relative flex-1 min-w-[180px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar por lugar o comentario..."
          value={reviewSearch}
          onChange={(e) => setReviewSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchReviews()}
          className="pl-8 h-8 text-sm"
        />
      </div>
      {[
        { label: "Todas", value: "" },
        { label: "✅ Visibles", value: "visible" },
        { label: "🙈 Ocultas", value: "hidden" },
      ].map((f) => (
        <button
          key={f.value}
          onClick={() => { setReviewFilter(f.value); fetchReviews(f.value) }}
          className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
            reviewFilter === f.value
              ? "border-primary/40 bg-primary/8 text-primary"
              : "border-border bg-card text-muted-foreground hover:border-border/80"
          }`}
        >
          {f.label}
        </button>
      ))}
      <Button size="sm" variant="secondary" className="h-8" onClick={() => fetchReviews()}>
        Buscar
      </Button>
    </div>

    {reviewsLoading ? (
      <div className="text-center py-10 text-muted-foreground text-sm">Cargando reseñas...</div>
    ) : reviews.length === 0 ? (
      <div className="text-center py-10 text-muted-foreground text-sm">No hay reseñas</div>
    ) : (
      <div className="divide-y divide-border">
        {reviews.map((review) => {
          // placeId puede ser null si el lugar fue eliminado
          const placeId = review.placeId as any
          const placeName = placeId?.name ?? "Lugar eliminado"
          const placeMongoId = placeId?._id?.toString?.() ?? null

          return (
            <div key={review._id} className="p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  {placeMongoId ? (
                    <Link
                      href={`/lugar/${placeMongoId}`}
                      target="_blank"
                      className="text-sm font-bold text-primary hover:underline"
                    >
                      {placeName}
                    </Link>
                  ) : (
                    <span className="text-sm font-bold text-muted-foreground">
                      {placeName}
                    </span>
                  )}
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
                    <span>{review.userId?.name || "Usuario anónimo"}</span>
                    <span>·</span>
                    <span className="text-amber-400">
                      {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                    </span>
                    <span>·</span>
                    <span>{new Date((review as any).createdAt).toLocaleDateString("es-AR")}</span>
                  </div>
                </div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border flex-shrink-0 ${
                  review.status === "visible"
                    ? "bg-primary/8 text-primary border-primary/20"
                    : "bg-destructive/8 text-destructive border-destructive/20"
                }`}>
                  {review.status === "visible" ? "✓ visible" : "✕ oculta"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3 line-clamp-3">
                {review.comment}
              </p>
              <div className="flex flex-wrap gap-2">
                {(review as any).pinned ? (
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                    onClick={() => handleReviewAction(review._id, "unpin")}>
                    📌 Quitar destaque
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                    onClick={() => handleReviewAction(review._id, "pin")}>
                    📌 Destacar
                  </Button>
                )}
                {review.status === "visible" ? (
                  <Button size="sm" variant="outline"
                    className="h-7 text-xs gap-1 text-amber-500 border-amber-500/30 hover:bg-amber-500/8"
                    onClick={() => handleReviewAction(review._id, "hide")}>
                    🙈 Ocultar
                  </Button>
                ) : (
                  <Button size="sm" variant="outline"
                    className="h-7 text-xs gap-1 text-primary border-primary/30"
                    onClick={() => handleReviewAction(review._id, "unhide")}>
                    ✅ Mostrar
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )}
  </div>

  )
}
