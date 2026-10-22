"use client"

import { useState } from "react"
import Link from "next/link"
import { CheckCheck, RotateCcw } from "lucide-react"
import type { VentureReviewItem } from "@/components/admin/types"
import type { AdminEstado } from "@/lib/admin-estado"
import { adminUi } from "@/lib/admin-ui"
import { decodeStoredText } from "@/lib/stored-text"
import { cn } from "@/lib/utils"
import { ActionMenu } from "@/components/admin/ui/action-menu"
import { AdminButton } from "@/components/admin/ui/button"
import { AdminEmptyState, AdminListSkeleton } from "@/components/admin/ui/states"
import { estadoActionLabel, updateAdminEstado } from "./AdminEstadoControls"
import { ReviewHeader, ReviewsToolbar, reviewMenuItems } from "./AdminReviewsSection"

export type AdminVentureReviewsSectionProps = {
  estadoFilter: string
  onEstadoFilter: (value: string) => void
  reviews: VentureReviewItem[]
  loading: boolean
  search: string
  setSearch: (v: string) => void
  filter: string
  setFilter: (v: string) => void
  fetchReviews: (status?: string) => void
  handleAction: (id: string, action: "hide" | "unhide" | "pin" | "unpin") => void
}

/**
 * Mismo patrón que las reseñas de lugares. Los emprendimientos no tienen
 * respuesta pública, así que la acción a la vista es la de gestión
 * (Marcar como respondido / Reabrir) y el resto va al ⋯.
 */
export function AdminVentureReviewsSection({
  estadoFilter,
  onEstadoFilter,
  reviews,
  loading,
  search,
  setSearch,
  filter,
  setFilter,
  fetchReviews,
  handleAction,
}: AdminVentureReviewsSectionProps) {
  const [busyId, setBusyId] = useState<string | null>(null)

  async function changeEstado(id: string, next: AdminEstado) {
    setBusyId(id)
    const ok = await updateAdminEstado(`/api/admin/venture-reviews/${id}`, next)
    setBusyId(null)
    if (ok) fetchReviews()
  }

  return (
    <div className={cn(adminUi.card, "overflow-hidden")}>
      <ReviewsToolbar
        search={search}
        onSearch={setSearch}
        runSearch={() => fetchReviews()}
        searchPlaceholder="Buscar por emprendimiento o comentario"
        estado={estadoFilter}
        onEstado={onEstadoFilter}
        visibility={filter}
        onVisibility={(value) => {
          setFilter(value)
          fetchReviews(value)
        }}
      />

      {loading ? (
        <AdminListSkeleton rows={4} label="Cargando reseñas…" />
      ) : reviews.length === 0 ? (
        <AdminEmptyState title="No hay reseñas con estos filtros" hint="Probá con Todos o Todas." />
      ) : (
        <ul className="divide-y divide-line">
          {reviews.map((review) => {
            const venture = review.ventureId as { _id?: string; name?: string; slug?: string } | undefined
            const ventureId = venture?._id?.toString?.() ?? null
            const venturePath = venture?.slug ?? ventureId
            const name = venture?.name ?? "Emprendimiento"
            const estado = review.estado ?? "pendiente"
            const mainNext: AdminEstado = estado === "pendiente" ? "respondido" : "pendiente"
            return (
              <li key={review._id} className="px-5 py-4">
                <article aria-label={`Reseña de ${review.userId?.name || "alguien"} sobre ${name}`}>
                  <ReviewHeader
                    target={
                      venturePath ? (
                        <Link href={`/emprendimientos/${venturePath}`} target="_blank" className="hover:underline">
                          {name}
                        </Link>
                      ) : (
                        <span className="text-ink-muted">{name}</span>
                      )
                    }
                    author={review.userId?.name || "Sin nombre"}
                    rating={review.rating}
                    createdAt={review.createdAt}
                    estado={review.estado}
                    status={review.status}
                    pinned={review.pinned}
                  />
                  <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-olive">
                    {decodeStoredText(review.comment)}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <AdminButton disabled={busyId === review._id} onClick={() => changeEstado(review._id, mainNext)}>
                      {mainNext === "respondido" ? (
                        <CheckCheck className="h-4 w-4" aria-hidden />
                      ) : (
                        <RotateCcw className="h-4 w-4" aria-hidden />
                      )}
                      {estadoActionLabel(mainNext)}
                    </AdminButton>
                    <ActionMenu
                      label={`Más acciones para la reseña sobre ${name}`}
                      align="start"
                      items={reviewMenuItems({
                        pinned: review.pinned,
                        status: review.status,
                        estado: review.estado,
                        onAction: (action) => handleAction(review._id, action),
                        onEstado: (next) => changeEstado(review._id, next),
                      }).filter((item) => item.label !== estadoActionLabel(mainNext))}
                    />
                  </div>
                </article>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
