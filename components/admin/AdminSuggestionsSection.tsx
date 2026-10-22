"use client"

import { useState } from "react"
import { AlertTriangle, Check, MapPin, PencilLine, Search, X } from "lucide-react"
import { RejectionReasonDialog } from "@/components/admin/RejectionReasonDialog"
import { SuggestionEditModal } from "@/components/admin/SuggestionEditModal"
import { SuggestionResearchPanel } from "@/components/admin/SuggestionResearchPanel"
import type { AdminCounts, SuggestionItem } from "@/components/admin/types"
import { AdminButton } from "@/components/admin/ui/button"
import { FilterChip } from "@/components/admin/ui/filter-chip"
import { AdminSectionTitle } from "@/components/admin/ui/page-header"
import { StatusBadge } from "@/components/admin/ui/status-badge"
import { AdminEmptyState, AdminListSkeleton } from "@/components/admin/ui/states"
import { adminUi } from "@/lib/admin-ui"
import { cn } from "@/lib/utils"

export type AdminSuggestionsSectionProps = {
  counts: AdminCounts | null
  suggestions: SuggestionItem[]
  loading: boolean
  suggestionSearch: string
  setSuggestionSearch: (v: string) => void
  handleSuggestionAction: (id: string, action: "approve" | "reject", rejectionReason?: string) => Promise<void> | void
  editingSuggestion: SuggestionItem | null
  setEditingSuggestion: (s: SuggestionItem | null) => void
  fetchSuggestions: () => void
  getTypeLabel: (type: string) => string
}

export function AdminSuggestionsSection(props: AdminSuggestionsSectionProps) {
const {
  counts,
  suggestions,
  loading,
  suggestionSearch,
  setSuggestionSearch,
  handleSuggestionAction,
  editingSuggestion,
  setEditingSuggestion,
  fetchSuggestions,
  getTypeLabel,
} = props
const [rejectingSuggestion, setRejectingSuggestion] = useState<SuggestionItem | null>(null)
  const [researchFilter, setResearchFilter] = useState<"all" | "needs_research" | "needs_admin">(
    "all"
  )
  const [draftPatchOverride, setDraftPatchOverride] = useState<Record<string, unknown> | null>(
    null
  )
  return (
  <div className={cn(adminUi.card, "overflow-hidden")}>
    <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
      <AdminSectionTitle hint="Revisá cada lugar antes de publicarlo. La IA investiga Google y la web pública; vos decidís si se publica.">
        Lugares sugeridos
      </AdminSectionTitle>
      {counts?.suggestionsPending ? (
        <StatusBadge tone="warning">{counts.suggestionsPending} pendientes</StatusBadge>
      ) : null}
    </div>

    <div className="space-y-3 border-b border-line px-5 py-4">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
        <input
          placeholder="Buscar por nombre, dirección, barrio…"
          value={suggestionSearch}
          onChange={(e) => setSuggestionSearch(e.target.value)}
          className={cn(adminUi.input, "pl-9")}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["all", "Todas"],
            ["needs_research", "Falta investigar"],
            ["needs_admin", "Revisión manual"],
          ] as const
        ).map(([id, label]) => (
          <FilterChip key={id} selected={researchFilter === id} onClick={() => setResearchFilter(id)}>
            {label}
          </FilterChip>
        ))}
      </div>
    </div>

    {loading ? (
      <AdminListSkeleton rows={3} label="Cargando sugerencias…" />
    ) : suggestions.length === 0 ? (
      <AdminEmptyState title="No hay sugerencias pendientes" hint="Cuando alguien sugiera un lugar, aparece acá." />
    ) : (
      <div className="divide-y divide-line">
        {suggestions
          .filter((s) => {
            if (researchFilter === "needs_research") {
              const st = s.aiResearch?.status
              return !st || st === "pending" || st === "failed"
            }
            if (researchFilter === "needs_admin") {
              return s.aiResearch?.status === "done" && s.aiResearch.needsAdmin
            }
            return true
          })
          .filter((s) => {
            if (!suggestionSearch.trim()) return true
            const q = suggestionSearch.toLowerCase()
            return (
              s.placeDraft.name?.toLowerCase().includes(q) ||
              s.placeDraft.address?.toLowerCase().includes(q) ||
              s.placeDraft.neighborhood?.toLowerCase().includes(q)
            )
          })
          .map((suggestion, idx) => (
            <div key={suggestion._id} className="flex items-start gap-3 px-5 py-4">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-olive/8 text-xs font-bold tabular-nums text-olive">
                {idx + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className="mb-1 font-semibold text-olive">{suggestion.placeDraft.name}</p>
                <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-muted">
                  <span>{getTypeLabel(suggestion.placeDraft.types?.[0] ?? suggestion.placeDraft.type)}</span>
                  <span aria-hidden>·</span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" aria-hidden />
                    {suggestion.placeDraft.neighborhood}
                  </span>
                  <span aria-hidden>·</span>
                  <span className="max-w-[260px] truncate">{suggestion.placeDraft.address}</span>
                </div>
                {suggestion.suggestedByUserId?.name && (
                  <p className="mb-3 text-xs text-ink-muted">Sugerido por {suggestion.suggestedByUserId.name}</p>
                )}
                {suggestion.duplicateCandidates?.length ? (
                  <div
                    className={`mb-3 rounded-2xl border px-3 py-2 text-xs ${
                      suggestion.duplicateCandidates.some(
                        (candidate) => candidate.matchLevel === "exact"
                      )
                        ? "border-danger bg-danger-soft"
                        : "border-warning-bar bg-warning-soft"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <AlertTriangle
                        className={`mt-0.5 h-4 w-4 shrink-0 ${
                          suggestion.duplicateCandidates.some(
                            (candidate) => candidate.matchLevel === "exact"
                          )
                            ? "text-danger"
                            : "text-warning"
                        }`}
                      />
                      <div className="min-w-0 space-y-1.5">
                        <p
                          className={`font-semibold ${
                            suggestion.duplicateCandidates.some(
                              (candidate) => candidate.matchLevel === "exact"
                            )
                              ? "text-danger"
                              : "text-warning"
                          }`}
                        >
                          {suggestion.duplicateCandidates.some(
                            (candidate) => candidate.matchLevel === "exact"
                          )
                            ? "Ya existe en el mapa (nombre, dirección y tipo)"
                            : "Posible duplicado"}
                        </p>
                        <div className="space-y-1">
                          {suggestion.duplicateCandidates.map((candidate) => (
                            <div key={`${candidate.kind}-${candidate.id}`} className="text-olive">
                              <span className="font-medium">{candidate.name}</span>
                              <span className="text-ink-muted">
                                {" "}({candidate.kind === "place" ? "ya publicado" : "otra sugerencia pendiente"})
                              </span>
                              {candidate.address ? (
                                <span className="text-ink-muted"> · {candidate.address}</span>
                              ) : null}
                              {candidate.type ? (
                                <span className="text-ink-muted">
                                  {" "}· {getTypeLabel(candidate.type)}
                                </span>
                              ) : null}
                              {candidate.neighborhood && (
                                <span className="text-ink-muted"> · {candidate.neighborhood}</span>
                              )}
                              {candidate.distanceMeters != null && (
                                <span className="text-ink-muted">
                                  {" "}· {formatDistance(candidate.distanceMeters)}
                                </span>
                              )}
                              <div className="text-[11px] text-ink-muted">
                                {candidate.matchLevel === "exact"
                                  ? "Coincidencia exacta: nombre, dirección y tipo"
                                  : `Coincidencias: ${candidate.reasons.join(", ")} · score ${candidate.score}`}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
                <SuggestionResearchPanel
                  suggestionId={suggestion._id}
                  aiResearch={suggestion.aiResearch}
                  onUpdated={fetchSuggestions}
                  onApplyPatch={(patch) => {
                    setDraftPatchOverride(patch)
                    setEditingSuggestion(suggestion)
                  }}
                />
                <div className="flex flex-wrap gap-2">
                  <AdminButton variant="primary" onClick={() => handleSuggestionAction(suggestion._id, "approve")}>
                    <Check className="h-4 w-4" aria-hidden />
                    Publicar lugar
                  </AdminButton>
                  <AdminButton onClick={() => setEditingSuggestion(suggestion)}>
                    <PencilLine className="h-4 w-4" aria-hidden />
                    Revisar y editar
                  </AdminButton>
                  <AdminButton variant="danger" onClick={() => setRejectingSuggestion(suggestion)}>
                    <X className="h-4 w-4" aria-hidden />
                    Rechazar
                  </AdminButton>
                </div>
              </div>
            </div>
          ))}
      </div>
    )}

    {editingSuggestion && (
      <SuggestionEditModal
        suggestionId={editingSuggestion._id}
        placeDraft={
          draftPatchOverride
            ? ({ ...editingSuggestion.placeDraft, ...draftPatchOverride } as any)
            : (editingSuggestion.placeDraft as any)
        }
        open={!!editingSuggestion}
        onOpenChange={(open) => {
          if (!open) {
            setEditingSuggestion(null)
            setDraftPatchOverride(null)
          }
        }}
        onSaved={fetchSuggestions}
        onApproved={fetchSuggestions}
      />
    )}
    <RejectionReasonDialog
      open={!!rejectingSuggestion}
      title="Rechazar sugerencia"
      description="Este mensaje se va a enviar por email a la persona que sugirio el lugar."
      itemName={rejectingSuggestion?.placeDraft.name}
      onOpenChange={(open) => {
        if (!open) setRejectingSuggestion(null)
      }}
      onConfirm={async (reason) => {
        if (!rejectingSuggestion) return
        await handleSuggestionAction(rejectingSuggestion._id, "reject", reason)
        setRejectingSuggestion(null)
      }}
    />
  </div>

  )
}

function formatDistance(distanceMeters: number): string {
  if (distanceMeters < 1000) return `${distanceMeters} m`
  return `${(distanceMeters / 1000).toFixed(1)} km`
}
