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

type GoogleQueueStats = {
  queued: number
  running: number
  done: number
  failed: number
  needsSync: number
  withSnapshot: number
  coveragePct: number
  approvedTotal: number
  workerActive: boolean
  stalled?: boolean
  stuckRunning?: number
  configured?: boolean
}

type GoogleSyncPlace = {
  _id: string
  name: string
  address?: string
  neighborhood?: string
  googlePlaceId?: string
  syncStatus?: string
  syncError?: string
  rating?: number
  userRatingCount?: number
  syncedAt?: string
  glutenRelevantCount?: number
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
  stillIncomplete?: boolean
}

type ReviewFilter = "all" | "done" | "failed" | "pending"

type Props = {
  mode: "duplicates" | "incomplete" | "google" | null
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
  const [incompleteOnlyCount, setIncompleteOnlyCount] = useState<number | null>(null)
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null)
  const [googleStats, setGoogleStats] = useState<GoogleQueueStats | null>(null)
  const [googlePlaces, setGooglePlaces] = useState<GoogleSyncPlace[]>([])
  const [googleFilter, setGoogleFilter] = useState<"all" | "done" | "failed" | "pending">("pending")
  const [selectedDeleteIds, setSelectedDeleteIds] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("done")
  const lastAutoResumeRef = useRef(0)

  const filterCounts = useMemo(() => {
    const counts = { all: 0, done: 0, failed: 0, pending: 0 }
    for (const place of incompletePlaces) {
      counts.all++
      const status = place.enrichmentStatus ?? "pending"
      if (status === "done") counts.done++
      else if (status === "failed") counts.failed++
      else if (status === "pending" || !place.aiEnrichment?.status) counts.pending++
    }
    return counts
  }, [incompletePlaces])

  const filteredIncompletePlaces = useMemo(() => {
    return incompletePlaces.filter((place) => {
      const status = place.enrichmentStatus ?? "pending"
      if (reviewFilter === "all") return true
      if (reviewFilter === "done") return status === "done"
      if (reviewFilter === "failed") return status === "failed"
      return status === "pending" || !place.aiEnrichment?.status
    })
  }, [incompletePlaces, reviewFilter])

  const filteredGooglePlaces = useMemo(() => {
    return googlePlaces.filter((place) => {
      const status = place.syncStatus ?? "pending"
      if (googleFilter === "all") return true
      if (googleFilter === "done") return status === "done"
      if (googleFilter === "failed") return status === "failed"
      return status === "queued" || status === "running" || !place.syncStatus
    })
  }, [googlePlaces, googleFilter])

  const googleFilterCounts = useMemo(() => {
    const counts = { all: 0, done: 0, failed: 0, pending: 0 }
    for (const place of googlePlaces) {
      counts.all++
      const status = place.syncStatus ?? "pending"
      if (status === "done") counts.done++
      else if (status === "failed") counts.failed++
      else counts.pending++
    }
    return counts
  }, [googlePlaces])

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
    setIncompleteOnlyCount(data.incompleteCount ?? null)
    setQueueStats(data.queue || null)
  }

  const refreshGoogle = async () => {
    const res = await fetch("/api/admin/places/google-sync-queue")
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Error al leer cola Google")
    setGoogleStats(data)
    setGooglePlaces(data.places || [])
  }

  useEffect(() => {
    if (!mode) return
    setLoading(true)
    const load = async () => {
      try {
        if (mode === "duplicates") {
          await reloadDuplicates()
        } else if (mode === "incomplete") {
          await refreshIncomplete()
        } else {
          await refreshGoogle()
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

  useEffect(() => {
    if (mode !== "google") return
    const timer = setInterval(() => {
      void refreshGoogle()
        .then(async () => {
          onRefreshPlaces()
          const res = await fetch("/api/admin/places/google-sync-queue")
          if (!res.ok) return
          const stats = (await res.json()) as GoogleQueueStats
          if (stats.stalled && (stats.queued > 0 || (stats.stuckRunning ?? 0) > 0)) {
            const now = Date.now()
            if (now - lastAutoResumeRef.current > 60_000) {
              lastAutoResumeRef.current = now
              await fetch("/api/admin/places/google-sync-queue", {
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

  const startGoogleQueue = async () => {
    setEnriching(true)
    try {
      const res = await fetch("/api/admin/places/google-sync-queue", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al iniciar cola Google")
      toast.success(data.message || "Cola Google iniciada")
      await refreshGoogle()
      onRefreshPlaces()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al iniciar cola Google")
    } finally {
      setEnriching(false)
    }
  }

  const resumeGoogleQueue = async () => {
    setEnriching(true)
    try {
      const res = await fetch("/api/admin/places/google-sync-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resume" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al reanudar cola Google")
      toast.success("Cola Google reanudada")
      await refreshGoogle()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al reanudar")
    } finally {
      setEnriching(false)
    }
  }

  const runBatchEnrichment = startQueue

  if (!mode) return null

  const title =
    mode === "duplicates"
      ? "Revisar duplicados"
      : mode === "incomplete"
        ? "Lugares sin información"
        : "Reviews Google"

  const subtitle =
    mode === "duplicates"
      ? "Solo coincidencias exactas: mismo nombre, dirección y tipo. Marcá cuál borrar."
      : mode === "incomplete"
        ? "Solo lugares sin clasificar: 100% sin gluten u opciones sin TACC."
        : "Sincroniza rating y reseñas de Google. Celimap sigue siendo la fuente principal."

  return (
    <div className="border-b border-border bg-card/60 px-4 py-3 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold">{title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
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
      ) : mode === "incomplete" ? (
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
                {batchRemaining} para revisar
                {incompleteOnlyCount != null && incompleteOnlyCount !== batchRemaining
                  ? ` · ${incompleteOnlyCount} ficha mínima`
                  : null}
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: "done" as const, label: "Listos IA", count: filterCounts.done },
                { id: "failed" as const, label: "Fallidos", count: filterCounts.failed },
                { id: "pending" as const, label: "Sin investigar", count: filterCounts.pending },
                { id: "all" as const, label: "Todos", count: filterCounts.all },
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
                {filter.label} ({filter.count})
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
                      {place.missing.length > 0
                        ? `Falta: ${place.missing.join(", ")}`
                        : "Ficha completa — revisá informe IA"}
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
      ) : (
        <div className="space-y-3">
          {googleStats ? (
            <div className="rounded-lg border border-border/80 bg-background/40 px-3 py-2 text-[11px] text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
              <span>
                Cobertura:{" "}
                <strong className="text-foreground">
                  {googleStats.coveragePct}% ({googleStats.withSnapshot}/{googleStats.approvedTotal})
                </strong>
              </span>
              <span>
                Pendientes: <strong className="text-foreground">{googleStats.needsSync}</strong>
              </span>
              <span>
                En cola: <strong className="text-foreground">{googleStats.queued}</strong>
              </span>
              <span>
                Procesando: <strong className="text-foreground">{googleStats.running}</strong>
              </span>
              <span>
                Listos: <strong className="text-primary">{googleStats.done}</strong>
              </span>
              <span>
                Fallidos: <strong className="text-red-400">{googleStats.failed}</strong>
              </span>
              {googleStats.workerActive ? (
                <span className="text-primary flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Sync…
                </span>
              ) : googleStats.stalled ? (
                <span className="text-amber-400">Cola pausada</span>
              ) : null}
              {googleStats.configured === false ? (
                <span className="text-red-400">API Google no configurada</span>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              className="h-8 gap-1.5"
              onClick={startGoogleQueue}
              disabled={enriching || googleStats?.configured === false}
            >
              {enriching ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              Encolar y sincronizar
            </Button>
            {googleStats?.stalled ? (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={resumeGoogleQueue}
              >
                Reanudar cola
              </Button>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: "pending" as const, label: "En proceso", count: googleFilterCounts.pending },
                { id: "done" as const, label: "Listos", count: googleFilterCounts.done },
                { id: "failed" as const, label: "Fallidos", count: googleFilterCounts.failed },
                { id: "all" as const, label: "Todos", count: googleFilterCounts.all },
              ] as const
            ).map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setGoogleFilter(filter.id)}
                className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${
                  googleFilter === filter.id
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-border/80"
                }`}
              >
                {filter.label} ({filter.count})
              </button>
            ))}
          </div>

          <div className="space-y-2 max-h-[32rem] overflow-y-auto">
            {filteredGooglePlaces.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No hay lugares en este filtro. Encolá para sincronizar.
              </p>
            ) : (
              filteredGooglePlaces.map((place) => (
                <div
                  key={place._id}
                  className="rounded-lg border border-border/80 bg-background/40 px-3 py-2 text-xs"
                >
                  <button
                    type="button"
                    className="font-semibold hover:underline text-left"
                    onClick={() => onEditPlace(place._id)}
                  >
                    {place.name}
                  </button>
                  <p className="text-muted-foreground truncate">
                    {place.address}
                    {place.neighborhood ? ` · ${place.neighborhood}` : ""}
                  </p>
                  <p className="text-[10px] mt-1 text-muted-foreground">
                    Estado:{" "}
                    <span
                      className={
                        place.syncStatus === "done"
                          ? "text-primary"
                          : place.syncStatus === "failed"
                            ? "text-red-400"
                            : "text-amber-400"
                      }
                    >
                      {place.syncStatus ?? "—"}
                    </span>
                    {place.rating != null ? (
                      <>
                        {" "}
                        · Google ★{place.rating.toFixed(1)}
                        {place.userRatingCount != null
                          ? ` (${place.userRatingCount})`
                          : ""}
                      </>
                    ) : null}
                    {place.glutenRelevantCount
                      ? ` · ${place.glutenRelevantCount} reseñas GF`
                      : null}
                  </p>
                  {place.syncError ? (
                    <p className="text-[10px] text-red-400 mt-0.5">{place.syncError}</p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
