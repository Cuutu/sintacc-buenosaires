"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Archive, Eye, EyeOff, MessageSquareReply, Pin, PinOff, RotateCcw, Search, CheckCheck } from "lucide-react"
import { ReviewAdminReply } from "@/components/review-admin-reply"
import type { ReviewItem } from "@/components/admin/types"
import type { AdminEstado } from "@/lib/admin-estado"
import { daysSince } from "@/lib/admin-quality"
import { adminUi } from "@/lib/admin-ui"
import { ADMIN_REPLY_DISPLAY_NAME } from "@/lib/constants"
import { decodeStoredText } from "@/lib/stored-text"
import { formatAdminDate } from "@/lib/admin-format"
import { cn } from "@/lib/utils"
import { ActionMenu, type ActionMenuItem } from "@/components/admin/ui/action-menu"
import { AdminButton } from "@/components/admin/ui/button"
import { StatusBadge, Tag } from "@/components/admin/ui/status-badge"
import { AdminEmptyState, AdminListSkeleton } from "@/components/admin/ui/states"
import {
  AdminEstadoBadge,
  AdminEstadoFilter,
  estadoActionLabel,
  nextEstados,
  updateAdminEstado,
} from "./AdminEstadoControls"

type ReviewAction = "hide" | "unhide" | "pin" | "unpin"

export type AdminReviewsSectionProps = {
  estadoFilter: string
  onEstadoFilter: (value: string) => void
  reviews: ReviewItem[]
  reviewsLoading: boolean
  reviewSearch: string
  setReviewSearch: (v: string) => void
  reviewFilter: string
  setReviewFilter: (v: string) => void
  fetchReviews: (status?: string) => void
  handleReviewAction: (id: string, action: ReviewAction) => void
}

/* —— Piezas compartidas con las reseñas de emprendimientos —— */

const VISIBILITY_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "visible", label: "Visibles" },
  { value: "hidden", label: "Ocultas" },
]

/** Busca sola mientras se escribe (sin botón "Buscar"), salteando el primer render. */
function useDebouncedSearch(value: string, run: () => void, delay = 400) {
  const mounted = useRef(false)
  const runRef = useRef(run)
  runRef.current = run
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    const t = setTimeout(() => runRef.current(), delay)
    return () => clearTimeout(t)
  }, [value, delay])
}

/** Una sola fila: buscador, gestión y visibilidad (antes eran dos filas de filtros). */
export function ReviewsToolbar({
  search,
  onSearch,
  runSearch,
  searchPlaceholder,
  estado,
  onEstado,
  visibility,
  onVisibility,
}: {
  search: string
  onSearch: (value: string) => void
  runSearch: () => void
  searchPlaceholder: string
  estado: string
  onEstado: (value: string) => void
  visibility: string
  onVisibility: (value: string) => void
}) {
  useDebouncedSearch(search, runSearch)
  return (
    <div className="flex flex-col gap-3 border-b border-line px-5 py-4 xl:flex-row xl:items-center">
      <div className="relative min-w-0 flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
        <input
          type="search"
          aria-label="Buscar reseñas"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && runSearch()}
          className={cn(adminUi.input, "pl-9")}
        />
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <AdminEstadoFilter value={estado} onChange={onEstado} className="max-w-full" />
        <select
          aria-label="Visibilidad"
          value={visibility}
          onChange={(e) => onVisibility(e.target.value)}
          className={adminUi.select}
        >
          {VISIBILITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

export function ReviewStars({ rating }: { rating: number }) {
  const n = Math.max(0, Math.min(5, Math.round(rating)))
  return (
    <span role="img" aria-label={`${n} de 5`} className="tracking-tight text-warning">
      {"★".repeat(n)}
      {"☆".repeat(5 - n)}
    </span>
  )
}

/** Visible = verde; oculta = neutro. Nunca rojo: ocultar no es un error. */
export function ReviewVisibilityBadge({ status }: { status: "visible" | "hidden" }) {
  return status === "visible" ? (
    <StatusBadge tone="success">Visible</StatusBadge>
  ) : (
    <StatusBadge tone="neutral">Oculta</StatusBadge>
  )
}

/** Encabezado de una reseña: a qué lugar, quién, estrellas, fecha y estados. */
export function ReviewHeader({
  target,
  author,
  rating,
  createdAt,
  estado,
  status,
  pinned,
}: {
  target: ReactNode
  author: string
  rating: number
  createdAt: string
  estado?: AdminEstado
  status: "visible" | "hidden"
  pinned?: boolean
}) {
  const days = daysSince(createdAt)
  const stale = (estado ?? "pendiente") === "pendiente" && days != null && days >= 2
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
      <div className="min-w-0">
        <div className="truncate font-semibold text-olive">{target}</div>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-sm text-ink-muted">
          <span>{author}</span>
          <span aria-hidden>·</span>
          <ReviewStars rating={rating} />
          <span aria-hidden>·</span>
          <time dateTime={createdAt}>{formatAdminDate(createdAt)}</time>
          {stale ? (
            <>
              <span aria-hidden>·</span>
              <span className="font-medium text-warning">{days} días sin resolver</span>
            </>
          ) : null}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-1.5 sm:justify-end">
        <AdminEstadoBadge estado={estado} />
        <ReviewVisibilityBadge status={status} />
        {pinned ? <Tag>Destacada</Tag> : null}
      </div>
    </div>
  )
}

/** Ítems del ⋯: destacar, ocultar y gestión. Las acciones de moderación no van a la vista. */
export function reviewMenuItems({
  pinned,
  status,
  estado,
  onAction,
  onEstado,
  pinLabels = ["Destacar", "Quitar destaque"],
}: {
  pinned?: boolean
  status: "visible" | "hidden"
  estado?: AdminEstado
  onAction: (action: ReviewAction) => void
  onEstado: (next: AdminEstado) => void
  pinLabels?: [string, string]
}): ActionMenuItem[] {
  const icon = { className: "h-4 w-4", "aria-hidden": true } as const
  return [
    pinned
      ? { label: pinLabels[1], icon: <PinOff {...icon} />, onSelect: () => onAction("unpin") }
      : { label: pinLabels[0], icon: <Pin {...icon} />, onSelect: () => onAction("pin") },
    status === "visible"
      ? { label: "Ocultar", icon: <EyeOff {...icon} />, onSelect: () => onAction("hide") }
      : { label: "Mostrar", icon: <Eye {...icon} />, onSelect: () => onAction("unhide") },
    ...nextEstados(estado).map((next) => ({
      label: estadoActionLabel(next),
      icon:
        next === "pendiente" ? <RotateCcw {...icon} /> : next === "respondido" ? <CheckCheck {...icon} /> : <Archive {...icon} />,
      onSelect: () => onEstado(next),
    })),
  ]
}

/* —— Respuesta pública como CeliMap (mismo endpoint que el formulario de la ficha) —— */

function ReplyComposer({
  reviewId,
  existingReply,
  onDone,
  onCancel,
}: {
  reviewId: string
  existingReply?: string
  onDone: () => void
  onCancel: () => void
}) {
  const [reply, setReply] = useState(decodeStoredText(existingReply))
  const [busy, setBusy] = useState(false)

  async function send(body: Record<string, unknown>, ok: string) {
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "No se pudo guardar la respuesta")
      toast.success(ok)
      window.dispatchEvent(new Event("admin:counts-changed"))
      onDone()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la respuesta")
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      className="mt-3 space-y-3 rounded-2xl border border-line bg-cream p-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (!reply.trim()) {
          toast.error("Escribí una respuesta")
          return
        }
        void send({ action: "reply", reply: reply.trim() }, existingReply ? "Respuesta actualizada" : "Respuesta publicada")
      }}
    >
      <label className="block text-xs font-semibold text-ink-muted" htmlFor={`reply-${reviewId}`}>
        Respuesta pública como {ADMIN_REPLY_DISPLAY_NAME}
      </label>
      <textarea
        id={`reply-${reviewId}`}
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        maxLength={800}
        rows={3}
        placeholder="Gracias por tu reseña. Te contamos que…"
        className="w-full rounded-2xl border border-line bg-cream-card px-3 py-2 text-sm text-olive outline-none placeholder:text-ink-muted focus-visible:ring-2 focus-visible:ring-olive/30"
      />
      <div className="flex flex-wrap items-center gap-2">
        <AdminButton type="submit" variant="primary" disabled={busy || !reply.trim()}>
          {busy ? "Guardando…" : existingReply ? "Actualizar respuesta" : "Publicar respuesta"}
        </AdminButton>
        <AdminButton variant="quiet" disabled={busy} onClick={onCancel}>
          Cancelar
        </AdminButton>
        {existingReply ? (
          <AdminButton
            variant="danger"
            className="sm:ml-auto"
            disabled={busy}
            onClick={() => {
              if (confirm("¿Borrar la respuesta pública?")) void send({ action: "delete_reply" }, "Respuesta borrada")
            }}
          >
            Borrar respuesta
          </AdminButton>
        ) : null}
      </div>
    </form>
  )
}

/* —— Reseñas de lugares —— */

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
  const [replyingId, setReplyingId] = useState<string | null>(null)
  const refresh = () => fetchReviews(reviewFilter || undefined)

  return (
    <div className={cn(adminUi.card, "overflow-hidden")}>
      <ReviewsToolbar
        search={reviewSearch}
        onSearch={setReviewSearch}
        runSearch={() => fetchReviews()}
        searchPlaceholder="Buscar por lugar o comentario"
        estado={props.estadoFilter}
        onEstado={props.onEstadoFilter}
        visibility={reviewFilter}
        onVisibility={(value) => {
          setReviewFilter(value)
          fetchReviews(value)
        }}
      />

      {reviewsLoading ? (
        <AdminListSkeleton rows={4} label="Cargando reseñas…" />
      ) : reviews.length === 0 ? (
        <AdminEmptyState title="No hay reseñas con estos filtros" hint="Probá con Todos o Todas." />
      ) : (
        <ul className="divide-y divide-line">
          {reviews.map((review) => {
            // placeId puede venir null si el lugar se borró.
            const place = review.placeId as ReviewItem["placeId"] | null
            const placeName = place?.name ?? "Lugar borrado"
            const placeMongoId = place?._id?.toString?.() ?? null
            const replying = replyingId === review._id
            return (
              <li key={review._id} className="px-5 py-4">
                <article aria-label={`Reseña de ${review.userId?.name || "alguien"} sobre ${placeName}`}>
                  <ReviewHeader
                    target={
                      placeMongoId ? (
                        <Link href={`/lugar/${placeMongoId}`} target="_blank" className="hover:underline">
                          {placeName}
                        </Link>
                      ) : (
                        <span className="text-ink-muted">{placeName}</span>
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
                  {review.adminReply && !replying ? (
                    <ReviewAdminReply
                      reply={review.adminReply}
                      repliedAt={review.adminReplyAt}
                      repliedBy={review.adminReplyBy}
                    />
                  ) : null}
                  {replying ? (
                    <ReplyComposer
                      reviewId={review._id}
                      existingReply={review.adminReply}
                      onCancel={() => setReplyingId(null)}
                      onDone={() => {
                        setReplyingId(null)
                        refresh()
                      }}
                    />
                  ) : null}
                  <div className="mt-3 flex items-center gap-2">
                    {replying ? null : (
                      <AdminButton onClick={() => setReplyingId(review._id)}>
                        <MessageSquareReply className="h-4 w-4" aria-hidden />
                        {review.adminReply ? "Editar respuesta" : "Responder"}
                      </AdminButton>
                    )}
                    <ActionMenu
                      label={`Más acciones para la reseña sobre ${placeName}`}
                      align="start"
                      items={reviewMenuItems({
                        pinned: review.pinned,
                        status: review.status,
                        estado: review.estado,
                        onAction: (action) => handleReviewAction(review._id, action),
                        onEstado: async (next) => {
                          if (await updateAdminEstado(`/api/admin/reviews/${review._id}`, next)) refresh()
                        },
                      })}
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
