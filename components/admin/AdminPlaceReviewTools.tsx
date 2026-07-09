"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Loader2, Sparkles, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import { TYPES } from "@/lib/constants"
import type { PlaceDuplicatePair } from "@/lib/place-duplicates-scan"
import type { AiResearchItem } from "@/components/admin/types"
import { PlaceResearchPanel } from "@/components/admin/PlaceResearchPanel"

type QueueStats = {
  queued: number
  running: number
  done: number
  failed: number
  incomplete: number
  workerActive: boolean
  stalled?: boolean
  stuckRunning?: number
}

type IncompletePlace = {
  _id: string
  name: string
  address?: string
  neighborhood?: string
  type?: string
  missing: string[]
  enrichmentStatus?: string
  enrichmentSummary?: string
  aiEnrichment?: AiResearchItem
}

type ReviewFilter = "all" | "done" | "failed" | "pending"

type Props = {
  mode: "duplicates" | "incomplete" | null
  onClose: () => void
  onRefreshPlaces: () => void
  onEditPlace: (id: string) => void
}

function typeLabel(type?: string) {
  if (!type) return "—"
  return TYPES.find((item) => item.value === type)?.label ?? type
}

export function AdminPlaceReviewTools({
  mode,
  onClose,
  onRefreshPlaces,
  onEditPlace,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [enriching, setEnriching] = useState(false)
  const [duplicatePairs, setDuplicatePairs] = useState<PlaceDuplicatePair[]>([])
  const [duplicateMeta, setDuplicateMeta] = useState<{ scanned: number; exactCount: number } | null>(
    null
  )
  const [incompletePlaces, setIncompletePlaces] = useState<IncompletePlace[]>([])
  const [batchRemaining, setBatchRemaining] = useState<number | null>(null)
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null)
  const [selectedDeleteIds, setSelectedDeleteIds] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("done")
  const lastAutoResumeRef = useRef(0)

  const filteredIncompletePlaces = useMemo(() => {
    return incompletePlaces.filter((place) => {
      const status = place.enrichmentStatus ?? "pending"
      if (reviewFilter === "all") return true
      if (reviewFilter === "done") return status === "done"
      if (reviewFilter === "failed") return status === "failed"
      return status === "pending" || !place.aiEnrichment?.status
    })
  }, [incompletePlaces, reviewFilter])

  const toggleDeleteSelection = (placeId: string) => {
    setSelectedDeleteIds((prev) => {
      const next = new Set(prev)
      if (next.has(placeId)) next.delete(placeId)
      else next.add(placeId)
      return next
    })
  }

  const reloadDuplicates = async () => {
    const res = await fetch("/api/admin/places/duplicates")
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Error al buscar duplicados")
    setDuplicatePairs(data.pairs || [])
    setDuplicateMeta({ scanned: data.scanned ?? 0, exactCount: data.exactCount ?? 0 })
    setSelectedDeleteIds(new Set())
  }

  const deleteSelectedDuplicates = async () => {
    if (selectedDeleteIds.size === 0) return
    if (
      !window.confirm(
        `¿Eliminar ${selectedDeleteIds.size} lugar(es) seleccionado(s)? Esta acción no se puede deshacer.`
      )
    ) {
      return
    }

    setDeleting(true)
    try {
      const res = await fetch("/api/admin/places/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: [...selectedDeleteIds],
          action: "delete",
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al eliminar")
      toast.success(data.message || "Lugares eliminados")
      await reloadDuplicates()
      onRefreshPlaces()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar")
    } finally {
      setDeleting(false)
    }
  }

  const refreshIncomplete = async () => {
    const res = await fetch("/api/admin/places/incomplete")
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Error al listar incompletos")
    setIncompletePlaces(data.places || [])
    setBatchRemaining(data.total ?? 0)
    setQueueStats(data.queue || null)
  }

  useEffect(() => {
    if (!mode) return
    setLoading(true)
    const load = async () => {
      try {
        if (mode === "duplicates") {
          await reloadDuplicates()
        } else {
          await refreshIncomplete()
        }
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Error al cargar")
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [mode])

  useEffect(() => {
    if (mode !== "incomplete") return
    const timer = setInterval(() => {
      void refreshIncomplete()
        .then(async () => {
          onRefreshPlaces()
          const res = await fetch("/api/admin/places/enrichment-queue")
          if (!res.ok) return
          const stats = (await res.json()) as QueueStats
          if (stats.stalled && (stats.queued > 0 || (stats.stuckRunning ?? 0) > 0)) {
            const now = Date.now()
            if (now - lastAutoResumeRef.current > 60_000) {
              lastAutoResumeRef.current = now
              await fetch("/api/admin/places/enrichment-queue", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "resume" }),
              })
            }
          }
        })
        .catch(() => {})
    }, 5000)
    return () => clearInterval(timer)
  }, [mode, onRefreshPlaces])

  const startQueue = async () => {
    setEnriching(true)
    try {
      const res = await fetch("/api/admin/places/enrichment-queue", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al iniciar cola")
      toast.success(data.message || "Cola iniciada")
      await refreshIncomplete()
      onRefreshPlaces()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al iniciar cola")
    } finally {
      setEnriching(false)
    }
  }

  const resumeQueue = async () => {
    setEnriching(true)
    try {
      const res = await fetch("/api/admin/places/enrichment-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resume" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al reanudar cola")
      toast.success("Cola reanudada")
      await refreshIncomplete()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al reanudar")
    } finally {
      setEnriching(false)
    }
  }

  const runBatchEnrichment = startQueue

  if (!mode) return null

  return (
    <div className="border-b border-border bg-card/60 px-4 py-3 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold">
            {mode === "duplicates" ? "Revisar duplicados" : "Lugares sin información"}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {mode === "duplicates"
              ? "Solo coincidencias exactas: mismo nombre, dirección y tipo. Marcá cuál borrar."
              : "Enriquecé fichas vacías con Google + IA. Revisá informes, aplicá datos y editá la ficha."}
          </p>
        </div>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-6 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
          Analizando…
        </div>
      ) : mode === "duplicates" ? (
        <div className="space-y-2">
          {duplicateMeta ? (
            <p className="text-[11px] text-muted-foreground">
              Escaneados {duplicateMeta.scanned} lugares · {duplicatePairs.length} duplicados
              exactos
            </p>
          ) : null}

          {duplicatePairs.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="destructive"
                className="h-8 gap-1.5"
                disabled={deleting || selectedDeleteIds.size === 0}
                onClick={deleteSelectedDuplicates}
              >
                {deleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Eliminar seleccionados ({selectedDeleteIds.size})
              </Button>
            </div>
          ) : null}

          <div className="space-y-2 max-h-80 overflow-y-auto">
          {duplicatePairs.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              No hay duplicados exactos.
            </p>
          ) : (
            duplicatePairs.map((pair, index) => (
              <div
                key={`${pair.placeA.id}-${pair.placeB.id}-${index}`}
                className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs"
              >
                <div className="flex items-center gap-1 font-semibold mb-2 text-red-200">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                  Duplicado exacto
                </div>
                <div className="space-y-2 text-foreground/90">
                  {([pair.placeA, pair.placeB] as const).map((place) => (
                    <label
                      key={place.id}
                      className="flex items-start gap-2 rounded border border-border/50 bg-background/30 px-2 py-1.5 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={selectedDeleteIds.has(place.id)}
                        onChange={() => toggleDeleteSelection(place.id)}
                      />
                      <span className="min-w-0">
                        <button
                          type="button"
                          className="font-medium hover:underline text-left"
                          onClick={(e) => {
                            e.preventDefault()
                            onEditPlace(place.id)
                          }}
                        >
                          {place.name}
                        </button>
                        <span className="text-muted-foreground block">
                          {typeLabel(place.type)} · {place.address}
                          {place.neighborhood ? ` · ${place.neighborhood}` : ""}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))
          )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {queueStats ? (
            <div className="rounded-lg border border-border/80 bg-background/40 px-3 py-2 text-[11px] text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
              <span>En cola: <strong className="text-foreground">{queueStats.queued}</strong></span>
              <span>Procesando: <strong className="text-foreground">{queueStats.running}</strong></span>
              <span>Listos: <strong className="text-primary">{queueStats.done}</strong></span>
              <span>Fallidos: <strong className="text-red-400">{queueStats.failed}</strong></span>
              {queueStats.workerActive ? (
                <span className="text-primary flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Procesando…
                </span>
              ) : queueStats.stalled ? (
                <span className="text-amber-400">Cola pausada</span>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              className="h-8 gap-1.5"
              onClick={runBatchEnrichment}
              disabled={enriching || incompletePlaces.length === 0}
            >
              {enriching ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              Encolar todos y enriquecer
            </Button>
            {queueStats && queueStats.stalled ? (
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={resumeQueue}>
                Reanudar cola
              </Button>
            ) : null}
            {batchRemaining != null ? (
              <span className="text-[11px] text-muted-foreground">
                {batchRemaining} fichas mínimas
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: "done" as const, label: "Listos IA" },
                { id: "failed" as const, label: "Fallidos" },
                { id: "pending" as const, label: "Sin investigar" },
                { id: "all" as const, label: "Todos" },
              ] as const
            ).map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setReviewFilter(filter.id)}
                className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${
                  reviewFilter === filter.id
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-border/80"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="space-y-3 max-h-[32rem] overflow-y-auto">
            {filteredIncompletePlaces.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No hay lugares en este filtro.
              </p>
            ) : (
              filteredIncompletePlaces.map((place) => (
                <div
                  key={place._id}
                  className="rounded-lg border border-border/80 bg-background/40 px-3 py-2 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-semibold">{place.name}</p>
                    <p className="text-muted-foreground truncate">
                      {place.address}
                      {place.neighborhood ? ` · ${place.neighborhood}` : ""}
                    </p>
                    <p className="text-[10px] text-amber-400 mt-1">
                      Falta: {place.missing.join(", ")}
                    </p>
                  </div>
                  <PlaceResearchPanel
                    placeId={place._id}
                    placeName={place.name}
                    aiResearch={place.aiEnrichment}
                    onUpdated={() => {
                      void refreshIncomplete()
                      onRefreshPlaces()
                    }}
                    onEditPlace={onEditPlace}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
