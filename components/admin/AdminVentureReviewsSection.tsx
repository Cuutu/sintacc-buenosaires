"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import type { VentureReviewItem } from "@/components/admin/types"

export type AdminVentureReviewsSectionProps = {
  reviews: VentureReviewItem[]
  loading: boolean
  search: string
  setSearch: (v: string) => void
  filter: string
  setFilter: (v: string) => void
  fetchReviews: (status?: string) => void
  handleAction: (id: string, action: "hide" | "unhide" | "pin" | "unpin") => void
}

export function AdminVentureReviewsSection({
  reviews,
  loading,
  search,
  setSearch,
  filter,
  setFilter,
  fetchReviews,
  handleAction,
}: AdminVentureReviewsSectionProps) {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-card">
        <h2 className="text-sm font-bold">Reseñas de emprendimientos</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Moderá opiniones de la comunidad sobre marcas y proyectos
        </p>
      </div>

      <div className="px-4 py-2 border-b border-border bg-card/50 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar emprendimiento o comentario..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchReviews()}
            className="pl-8 h-8 text-sm"
          />
        </div>
        {[
          { label: "Todas", value: "" },
          { label: "Visibles", value: "visible" },
          { label: "Ocultas", value: "hidden" },
        ].map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => {
              setFilter(f.value)
              fetchReviews(f.value)
            }}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              filter === f.value
                ? "border-primary/40 bg-primary/8 text-primary"
                : "border-border text-muted-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
        <Button size="sm" variant="secondary" className="h-8" onClick={() => fetchReviews()}>
          Buscar
        </Button>
      </div>

      {loading ? (
        <div className="py-10 text-center text-sm text-muted-foreground">Cargando...</div>
      ) : reviews.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">No hay reseñas</div>
      ) : (
        <div className="divide-y divide-border">
          {reviews.map((review) => {
            const venture = review.ventureId as {
              _id?: string
              name?: string
              slug?: string
            } | undefined
            const ventureId = venture?._id?.toString?.() ?? null
            const venturePath = venture?.slug ?? ventureId
            return (
              <div key={review._id} className="p-4">
                <div className="flex justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    {venturePath ? (
                      <Link
                        href={`/emprendimientos/${venturePath}`}
                        target="_blank"
                        className="text-sm font-bold text-primary hover:underline"
                      >
                        {venture?.name ?? "Emprendimiento"}
                      </Link>
                    ) : (
                      <span className="text-sm font-bold">{venture?.name ?? "—"}</span>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {review.userId?.name ?? "Usuario"} · {"★".repeat(review.rating)}
                      {"☆".repeat(5 - review.rating)}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded border shrink-0">
                    {review.status}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-3">{review.comment}</p>
                <div className="flex flex-wrap gap-2">
                  {review.status === "visible" ? (
                    <Button size="sm" variant="outline" onClick={() => handleAction(review._id, "hide")}>
                      Ocultar
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => handleAction(review._id, "unhide")}>
                      Mostrar
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction(review._id, review.pinned ? "unpin" : "pin")}
                  >
                    {review.pinned ? "Desfijar" : "Fijar"}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
