"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { TYPES } from "@/lib/constants"
import { SuggestionEditModal } from "@/components/admin/SuggestionEditModal"
import type { AdminCounts, SuggestionItem } from "@/components/admin/types"

export type AdminSuggestionsSectionProps = {
  counts: AdminCounts | null
  suggestions: SuggestionItem[]
  loading: boolean
  suggestionSearch: string
  setSuggestionSearch: (v: string) => void
  handleSuggestionAction: (id: string, action: "approve" | "reject") => void
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
  return (
  <div className="rounded-xl border border-border overflow-hidden">
    <div className="px-4 py-3 border-b border-border bg-card flex items-center justify-between">
      <div>
        <h2 className="text-sm font-bold flex items-center gap-2">
          📩 Lugares sugeridos
          {counts?.suggestionsPending != null && counts.suggestionsPending > 0 && (
            <span className="text-[10px] bg-red-500 text-white font-bold px-2 py-0.5 rounded-full">
              {counts.suggestionsPending} pendientes
            </span>
          )}
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Revisá cada lugar antes de publicarlo. Podés editar los datos si hay algo incorrecto.
        </p>
      </div>
    </div>

    {/* Buscador */}
    <div className="px-4 py-2 border-b border-border bg-card/50">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, dirección, barrio..."
          value={suggestionSearch}
          onChange={(e) => setSuggestionSearch(e.target.value)}
          className="pl-9 h-8 text-sm"
        />
      </div>
    </div>

    {loading ? (
      <div className="text-center py-10 text-muted-foreground text-sm">Cargando...</div>
    ) : suggestions.length === 0 ? (
      <div className="text-center py-10 text-muted-foreground">
        <div className="text-3xl mb-2">🎉</div>
        <p className="text-sm font-medium">¡No hay sugerencias pendientes!</p>
        <p className="text-xs mt-1">Cuando alguien sugiera un lugar aparecerá acá.</p>
      </div>
    ) : (
      <div className="divide-y divide-border">
        {suggestions
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
            <div key={suggestion._id} className="p-4 flex gap-3 items-start">
              {/* Número */}
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-bold font-mono flex items-center justify-center flex-shrink-0 mt-0.5">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm mb-1">{suggestion.placeDraft.name}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-1">
                  <span>{TYPES.find((t) => t.value === (suggestion.placeDraft.types?.[0] ?? suggestion.placeDraft.type))?.emoji} {getTypeLabel(suggestion.placeDraft.types?.[0] ?? suggestion.placeDraft.type)}</span>
                  <span>·</span>
                  <span>📍 {suggestion.placeDraft.neighborhood}</span>
                  <span>·</span>
                  <span className="truncate max-w-[200px]">{suggestion.placeDraft.address}</span>
                </div>
                {suggestion.suggestedByUserId?.name && (
                  <p className="text-xs text-muted-foreground/60 italic mb-3">
                    Sugerido por {suggestion.suggestedByUserId.name}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    className="h-8 gap-1.5 bg-primary text-primary-foreground"
                    onClick={() => handleSuggestionAction(suggestion._id, "approve")}
                  >
                    ✅ Publicar lugar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5"
                    onClick={() => setEditingSuggestion(suggestion)}
                  >
                    ✏️ Revisar y editar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 gap-1.5 text-muted-foreground hover:text-destructive"
                    onClick={() => handleSuggestionAction(suggestion._id, "reject")}
                  >
                    ❌ Rechazar
                  </Button>
                </div>
              </div>
            </div>
          ))}
      </div>
    )}

    {editingSuggestion && (
      <SuggestionEditModal
        suggestionId={editingSuggestion._id}
        placeDraft={editingSuggestion.placeDraft as any}
        open={!!editingSuggestion}
        onOpenChange={(open) => !open && setEditingSuggestion(null)}
        onSaved={fetchSuggestions}
        onApproved={fetchSuggestions}
      />
    )}
  </div>

  )
}
