"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Loader2, Sparkles, X } from "lucide-react"
import { toast } from "sonner"
import { TYPES } from "@/lib/constants"
import type { PlaceDuplicatePair } from "@/lib/place-duplicates-scan"

type QueueStats = {
  queued: number
  running: number
  done: number
  failed: number
  incomplete: number
  workerActive: boolean
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
}

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
          const res = await fetch("/api/admin/places/duplicates")
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || "Error al buscar duplicados")
          setDuplicatePairs(data.pairs || [])
          setDuplicateMeta({ scanned: data.scanned ?? 0, exactCount: data.exactCount ?? 0 })
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
    if (mode !== "incomplete" || !queueStats?.workerActive) return
    const timer = setInterval(() => {
      void refreshIncomplete().then(() => onRefreshPlaces())
    }, 5000)
    return () => clearInterval(timer)
  }, [mode, queueStats?.workerActive, onRefreshPlaces])

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

  const enrichOne = async (placeId: string) => {
    setEnriching(true)
    try {
      const res = await fetch(`/api/admin/places/${placeId}/research`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al investigar")
      toast.success("Lugar enriquecido con IA")
      await refreshIncomplete()
      onRefreshPlaces()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al investigar")
    } finally {
      setEnriching(false)
    }
  }

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
              ? "Compara nombre, dirección y tipo entre lugares publicados."
              : "Enriquecé fichas vacías (solo nombre/dirección) con Google + IA."}
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
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {duplicateMeta ? (
            <p className="text-[11px] text-muted-foreground">
              Escaneados {duplicateMeta.scanned} lugares · {duplicatePairs.length} pares ·{" "}
              {duplicateMeta.exactCount} exactos
            </p>
          ) : null}
          {duplicatePairs.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              No se encontraron duplicados relevantes.
            </p>
          ) : (
            duplicatePairs.map((pair, index) => (
              <div
                key={`${pair.placeA.id}-${pair.placeB.id}-${index}`}
                className={`rounded-lg border px-3 py-2 text-xs ${
                  pair.matchLevel === "exact"
                    ? "border-red-500/40 bg-red-500/10"
                    : "border-amber-500/30 bg-amber-500/10"
                }`}
              >
                <div className="flex items-center gap-1 font-semibold mb-1">
                  <AlertTriangle
                    className={`h-3.5 w-3.5 ${
                      pair.matchLevel === "exact" ? "text-red-400" : "text-amber-400"
                    }`}
                  />
                  {pair.matchLevel === "exact"
                    ? "Coincidencia exacta"
                    : "Posible duplicado"}
                </div>
                <div className="space-y-1 text-foreground/90">
                  <div>
                    <button
                      type="button"
                      className="font-medium hover:underline"
                      onClick={() => onEditPlace(pair.placeA.id)}
                    >
                      {pair.placeA.name}
                    </button>
                    <span className="text-muted-foreground">
                      {" "}
                      · {typeLabel(pair.placeA.type)} · {pair.placeA.address}
                    </span>
                  </div>
                  <div>
                    <button
                      type="button"
                      className="font-medium hover:underline"
                      onClick={() => onEditPlace(pair.placeB.id)}
                    >
                      {pair.placeB.name}
                    </button>
                    <span className="text-muted-foreground">
                      {" "}
                      · {typeLabel(pair.placeB.type)} · {pair.placeB.address}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {pair.reasons.join(", ")} · score {pair.score}
                  </p>
                </div>
              </div>
            ))
          )}
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
                  Cola activa
                </span>
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
            {queueStats && queueStats.queued > 0 && !queueStats.workerActive ? (
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

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {incompletePlaces.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No hay lugares con ficha mínima pendiente.
              </p>
            ) : (
              incompletePlaces.map((place) => (
                <div
                  key={place._id}
                  className="rounded-lg border border-border/80 bg-background/40 px-3 py-2 text-xs"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold">{place.name}</p>
                      <p className="text-muted-foreground truncate">
                        {place.address}
                        {place.neighborhood ? ` · ${place.neighborhood}` : ""}
                      </p>
                      <p className="text-[10px] text-amber-400 mt-1">
                        Falta: {place.missing.join(", ")}
                      </p>
                      {place.enrichmentStatus === "queued" ? (
                        <p className="text-[10px] text-primary mt-1">En cola…</p>
                      ) : null}
                      {place.enrichmentStatus === "done" && place.enrichmentSummary ? (
                        <p className="text-[10px] text-primary mt-1 line-clamp-2">
                          IA: {place.enrichmentSummary}
                        </p>
                      ) : null}
                      {place.enrichmentStatus === "failed" ? (
                        <p className="text-[10px] text-red-400 mt-1">IA falló — reintentar</p>
                      ) : null}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px] shrink-0"
                      disabled={
                        enriching ||
                        place.enrichmentStatus === "running" ||
                        place.enrichmentStatus === "queued"
                      }
                      onClick={() => enrichOne(place._id)}
                    >
                      {place.enrichmentStatus === "running" ||
                      place.enrichmentStatus === "queued" ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        "IA"
                      )}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
