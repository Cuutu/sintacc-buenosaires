"use client"

import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"
import { placeCardClass } from "./place-detail-ui"

/**
 * Formularios de la ficha que casi nadie abre: se bajan recién al usarlos.
 * El de reseña trae Radix Select y la subida de fotos (~20 KB gzip).
 */
const loadReviewForm = () => import("@/components/review-form")

/** Hover, pointerdown o foco en "Escribir reseña": empieza a bajar el formulario. */
export function preloadReviewForm(): void {
  void loadReviewForm().catch(() => undefined)
}

export const LazyReviewForm = dynamic(() => loadReviewForm().then((mod) => mod.ReviewForm), {
  ssr: false,
  loading: () => (
    <div
      className={`${placeCardClass} flex min-h-[280px] items-center justify-center`}
      aria-busy="true"
      aria-label="Cargando el formulario"
    >
      <Loader2 className="h-6 w-6 animate-spin text-[#1F4D35]/50" aria-hidden />
    </div>
  ),
})

/** Solo lo ven los admins, y la sesión se conoce en el cliente: nunca va en el HTML. */
export const LazyReviewAdminReplyForm = dynamic(
  () => import("@/components/review-admin-reply-form").then((mod) => mod.ReviewAdminReplyForm),
  { ssr: false }
)
