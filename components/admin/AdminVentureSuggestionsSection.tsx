"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { RejectionReasonDialog } from "@/components/admin/RejectionReasonDialog"
import { VentureSuggestionEditModal } from "@/components/admin/VentureSuggestionEditModal"
import { getCategoryLabel, getSafetyBadge } from "@/lib/venture-constants"
import type { AdminCounts, VentureSuggestionItem } from "@/components/admin/types"

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
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-card">
        <h2 className="text-sm font-bold flex items-center gap-2">
          Emprendimientos sugeridos
          {(counts?.ventureSuggestionsPending ?? 0) > 0 && (
            <span className="text-[10px] bg-red-500 text-white font-bold px-2 py-0.5 rounded-full">
              {counts?.ventureSuggestionsPending} pendientes
            </span>
          )}
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Marcas sin local físico. Si tiene local abierto, debe ir al mapa.
        </p>
      </div>

      <div className="px-4 py-2 border-b border-border bg-card/50">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o zona..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-8 text-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-muted-foreground text-sm">Cargando...</div>
      ) : suggestions.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">
          No hay sugerencias de emprendimientos pendientes
        </div>
      ) : (
        <div className="divide-y divide-border">
          {suggestions.map((s) => {
            const d = s.ventureDraft
            const safety = getSafetyBadge(d.safetyLevel)
            return (
              <div key={s._id} className="p-4 hover:bg-muted/30 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{d.name || "Sin nombre"}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {getCategoryLabel(d.category || "")} · {d.zone}
                      {s.suggestedByUserId?.name && ` · por ${s.suggestedByUserId.name}`}
                    </p>
                    <p className="text-xs mt-1">
                      {safety.dot} {safety.label}
                    </p>
                    {s.suggesterComment && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                        {s.suggesterComment}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" onClick={() => handleAction(s._id, "approve")}>
                      Aprobar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(s)}>
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setRejectingSuggestion(s)}
                    >
                      Rechazar
                    </Button>
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
