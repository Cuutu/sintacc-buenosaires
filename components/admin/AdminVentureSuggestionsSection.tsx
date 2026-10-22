"use client"

import { useState } from "react"
import { Search } from "lucide-react"
import { RejectionReasonDialog } from "@/components/admin/RejectionReasonDialog"
import { VentureSuggestionEditModal } from "@/components/admin/VentureSuggestionEditModal"
import { getCategoryLabels, getSafetyBadge, getVentureCategories } from "@/lib/venture-constants"
import type { AdminCounts, VentureSuggestionItem } from "@/components/admin/types"
import { AdminButton } from "@/components/admin/ui/button"
import { AdminSectionTitle } from "@/components/admin/ui/page-header"
import { StatusBadge, Tag } from "@/components/admin/ui/status-badge"
import { AdminEmptyState, AdminListSkeleton } from "@/components/admin/ui/states"
import { adminUi } from "@/lib/admin-ui"
import { cn } from "@/lib/utils"

export type AdminVentureSuggestionsSectionProps = {
  counts: AdminCounts | null
  suggestions: VentureSuggestionItem[]
  loading: boolean
  search: string
  setSearch: (v: string) => void
  handleAction: (id: string, action: "approve" | "reject", rejectionReason?: string) => Promise<void> | void
  editing: VentureSuggestionItem | null
  setEditing: (s: VentureSuggestionItem | null) => void
  fetchSuggestions: () => void
}

export function AdminVentureSuggestionsSection(props: AdminVentureSuggestionsSectionProps) {
  const {
    counts,
    suggestions,
    loading,
    search,
    setSearch,
    handleAction,
    editing,
    setEditing,
    fetchSuggestions,
  } = props
  const [rejectingSuggestion, setRejectingSuggestion] = useState<VentureSuggestionItem | null>(null)

  return (
    <div className={cn(adminUi.card, "overflow-hidden")}>
      <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
        <AdminSectionTitle hint="Emprendimientos sin local abierto al público. Si tiene local, va al mapa como lugar.">
          Emprendimientos sugeridos
        </AdminSectionTitle>
        {(counts?.ventureSuggestionsPending ?? 0) > 0 ? (
          <StatusBadge tone="warning">{counts?.ventureSuggestionsPending} pendientes</StatusBadge>
        ) : null}
      </div>

      <div className="border-b border-line px-5 py-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
          <input
            placeholder="Buscar por nombre o zona…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(adminUi.input, "pl-9")}
          />
        </div>
      </div>

      {loading ? (
        <AdminListSkeleton rows={3} label="Cargando sugerencias…" />
      ) : suggestions.length === 0 ? (
        <AdminEmptyState title="No hay emprendimientos sugeridos pendientes" />
      ) : (
        <div className="divide-y divide-line">
          {suggestions.map((s) => {
            const d = s.ventureDraft
            const safety = getSafetyBadge(d.safetyLevel)
            return (
              <div key={s._id} className="px-5 py-4">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-olive">{d.name || "Sin nombre"}</h3>
                    <p className="mt-1 text-sm text-ink-muted">
                      {getCategoryLabels(getVentureCategories(d)).join(", ")} · {d.zone}
                      {s.suggestedByUserId?.name && ` · por ${s.suggestedByUserId.name}`}
                    </p>
                    <div className="mt-2">
                      <Tag>{safety.label}</Tag>
                    </div>
                    {s.suggesterComment && (
                      <p className="mt-2 line-clamp-2 text-sm text-ink-muted">{s.suggesterComment}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <AdminButton variant="primary" onClick={() => handleAction(s._id, "approve")}>
                      Publicar
                    </AdminButton>
                    <AdminButton onClick={() => setEditing(s)}>Revisar y editar</AdminButton>
                    <AdminButton variant="danger" onClick={() => setRejectingSuggestion(s)}>
                      Rechazar
                    </AdminButton>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editing && (
        <VentureSuggestionEditModal
          suggestionId={editing._id}
          ventureDraft={editing.ventureDraft}
          suggesterComment={editing.suggesterComment}
          shipsNationwide={editing.shipsNationwide}
          open={!!editing}
          onOpenChange={(open) => !open && setEditing(null)}
          onSaved={fetchSuggestions}
          onApproved={fetchSuggestions}
        />
      )}
      <RejectionReasonDialog
        open={!!rejectingSuggestion}
        title="Rechazar emprendimiento"
        description="Este mensaje se va a enviar por email a la persona que sugirio el emprendimiento."
        itemName={rejectingSuggestion?.ventureDraft.name}
        onOpenChange={(open) => {
          if (!open) setRejectingSuggestion(null)
        }}
        onConfirm={async (reason) => {
          if (!rejectingSuggestion) return
          await handleAction(rejectingSuggestion._id, "reject", reason)
          setRejectingSuggestion(null)
        }}
      />
    </div>
  )
}
