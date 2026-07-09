"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronDown, Loader2, Sparkles, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { TYPES } from "@/lib/constants"
import type { AiResearchItem, DuplicateWarningItem } from "@/components/admin/types"

const POLL_MS = 5000
const STALE_MS = 90_000

type Props = {
  suggestionId: string
  aiResearch?: AiResearchItem
  onUpdated: () => void
  onApplyPatch?: (patch: Record<string, unknown>) => void
}

function confidenceColor(n?: number): string {
  if (n == null) return "bg-muted"
  if (n >= 70) return "bg-primary"
  if (n >= 40) return "bg-amber-500"
  return "bg-red-500"
}

function statusLabel(ai?: AiResearchItem): string {
  if (!ai?.status) return "Sin investigar"
  if (ai.status === "running") return "Investigando…"
  if (ai.status === "done") return ai.needsAdmin ? "Revisión manual" : "Informe listo"
  if (ai.status === "failed") return "Falló"
  return "Pendiente"
}

function safetyLabel(level?: string | null): string {
  if (level === "dedicated_gf") return "100% sin TACC"
  if (level === "gf_options") return "Opciones sin TACC"
  return "Sin evidencia clara"
}

function isRunningStale(ai?: AiResearchItem): boolean {
  if (ai?.status !== "running") return false
  if (!ai.startedAt) return true
  return Date.now() - new Date(ai.startedAt).getTime() > STALE_MS
}

function typeLabel(type?: string): string {
  if (!type) return "sin tipo"
  return TYPES.find((item) => item.value === type)?.label ?? type
}

function DuplicateWarningsList({ warnings }: { warnings: DuplicateWarningItem[] }) {
  const hasExact = warnings.some((warning) => warning.matchLevel === "exact")

  return (
    <div
      className={`rounded-lg border px-3 py-2 ${
        hasExact
          ? "border-red-500/40 bg-red-500/10"
          : "border-amber-500/30 bg-amber-500/10"
      }`}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle
          className={`mt-0.5 h-4 w-4 shrink-0 ${hasExact ? "text-red-400" : "text-amber-400"}`}
        />
        <div className="min-w-0 space-y-1.5">
          <p className={`font-semibold ${hasExact ? "text-red-200" : "text-amber-200"}`}>
            {hasExact
              ? "Ya existe en el mapa (nombre, dirección y tipo)"
              : "Posible duplicado"}
          </p>
          {warnings.map((warning) => (
            <div key={`${warning.kind}-${warning.id}`} className="text-[11px] leading-relaxed">
              <span className="font-medium text-foreground/90">{warning.name}</span>
              <span className="text-muted-foreground">
                {" "}
                ({warning.kind === "place" ? "publicado" : "otra sugerencia"})
              </span>
              {warning.address ? (
                <span className="text-muted-foreground"> · {warning.address}</span>
              ) : null}
              {warning.type ? (
                <span className="text-muted-foreground"> · {typeLabel(warning.type)}</span>
              ) : null}
              <div className="text-muted-foreground">
                {warning.matchLevel === "exact"
                  ? "Coincidencia exacta"
                  : `Coincidencias: ${warning.reasons.join(", ")}`}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function SuggestionResearchPanel({
  suggestionId,
  aiResearch,
  onUpdated,
  onApplyPatch,
}: Props) {
  const [open, setOpen] = useState(Boolean(aiResearch?.status === "done"))
  const [loading, setLoading] = useState(false)
  const [staleRunning, setStaleRunning] = useState(() => isRunningStale(aiResearch))

  useEffect(() => {
    if (aiResearch?.status !== "running") {
      setStaleRunning(false)
      return
    }
    setStaleRunning(isRunningStale(aiResearch))
    const staleTimer = setTimeout(() => setStaleRunning(true), STALE_MS)
    const pollTimer = setInterval(() => onUpdated(), POLL_MS)
    return () => {
      clearTimeout(staleTimer)
      clearInterval(pollTimer)
    }
  }, [aiResearch?.status, aiResearch?.startedAt, onUpdated])

  const runResearch = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/suggestions/${suggestionId}/research`, {
        method: "POST",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al investigar")
      toast.success(
        data.aiResearch?.draftAutoFilled
          ? "Investigación lista — borrador completado con Google"
          : "Investigación completada"
      )
      if (data.aiResearch?.duplicateWarnings?.length) {
        const exact = data.aiResearch.duplicateWarnings.some(
          (warning: DuplicateWarningItem) => warning.matchLevel === "exact"
        )
        toast.warning(
          exact
            ? "Atención: ya existe un lugar con mismo nombre, dirección y tipo"
            : "Posible duplicado detectado — revisá antes de publicar"
        )
      }
      setOpen(true)
      onUpdated()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al investigar")
    } finally {
      setLoading(false)
    }
  }

  const applyPatch = async () => {
    const patch = aiResearch?.suggestedDraftPatch
    if (!patch || !Object.keys(patch).length) {
      toast.error("No hay sugerencias de datos para aplicar")
      return
    }
    if (onApplyPatch) {
      onApplyPatch(patch as Record<string, unknown>)
      toast.success("Sugerencias aplicadas al borrador (revisá antes de publicar)")
      return
    }
    try {
      const res = await fetch(`/api/admin/suggestions/${suggestionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeDraft: patch }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al aplicar")
      toast.success("Datos sugeridos aplicados al borrador")
      onUpdated()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al aplicar")
    }
  }

  const running = aiResearch?.status === "running" && !staleRunning

  return (
    <div className="mb-3 rounded-lg border border-border/80 bg-card/40">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-border/60">
        <span
          className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${
            aiResearch?.status === "done"
              ? "border-primary/30 text-primary bg-primary/10"
              : aiResearch?.status === "failed"
                ? "border-red-500/30 text-red-400 bg-red-500/10"
                : staleRunning
                  ? "border-amber-500/30 text-amber-400 bg-amber-500/10"
                  : "border-border text-muted-foreground"
          }`}
        >
          IA ·{" "}
          {staleRunning
            ? "Investigación colgada"
            : statusLabel(aiResearch)}
        </span>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1 ml-auto"
          onClick={runResearch}
          disabled={loading || running}
        >
          {loading || running ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3" />
          )}
          {staleRunning
            ? "Reintentar investigación"
            : aiResearch?.status === "done" || aiResearch?.status === "failed"
              ? "Re-investigar"
              : "Investigar con IA"}
        </Button>
      </div>

      {staleRunning ? (
        <p className="px-3 py-2 text-xs text-amber-400">
          La investigación no terminó (común en deploy Vercel). Tocá reintentar.
        </p>
      ) : null}

      {aiResearch?.status === "failed" && aiResearch.error ? (
        <p className="px-3 py-2 text-xs text-red-400">{aiResearch.error}</p>
      ) : null}

      {aiResearch?.status === "done" && aiResearch.duplicateWarnings?.length ? (
        <div className="px-3 py-2">
          <DuplicateWarningsList warnings={aiResearch.duplicateWarnings} />
        </div>
      ) : null}

      {aiResearch?.status === "done" ? (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex w-full items-center gap-1 px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
            />
            Informe IA
            {aiResearch.costUsd != null ? (
              <span className="ml-1 text-[10px]">· ${aiResearch.costUsd.toFixed(3)}</span>
            ) : null}
          </button>
          {open ? (
            <div className="px-3 pb-3 space-y-3 text-xs">
              <p className="text-foreground/90 leading-relaxed">{aiResearch.summary}</p>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">Match Google</p>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full ${confidenceColor(aiResearch.matchConfidence)}`}
                      style={{ width: `${aiResearch.matchConfidence ?? 0}%` }}
                    />
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">Evidencia GF</p>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full ${confidenceColor(aiResearch.gfConfidence)}`}
                      style={{ width: `${aiResearch.gfConfidence ?? 0}%` }}
                    />
                  </div>
                </div>
              </div>

              <p>
                <span className="text-muted-foreground">Recomendación: </span>
                <span className="font-semibold">
                  {safetyLabel(aiResearch.recommendedSafetyLevel)}
                </span>
                {aiResearch.needsAdmin ? (
                  <span className="text-amber-400 ml-1">· requiere revisión</span>
                ) : null}
              </p>

              {aiResearch.evidence?.length ? (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase">
                    Evidencias
                  </p>
                  {aiResearch.evidence.map((ev, i) => (
                    <div
                      key={i}
                      className="rounded border border-border/60 bg-background/40 px-2 py-1.5"
                    >
                      <p className="text-[10px] text-primary uppercase">{ev.source}</p>
                      <p className="text-foreground/80 italic">&ldquo;{ev.quote}&rdquo;</p>
                      {ev.url ? (
                        <a
                          href={ev.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-primary hover:underline break-all"
                        >
                          {ev.url}
                        </a>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}

              {aiResearch.draftAutoFilled ? (
                <p className="text-[10px] text-primary">
                  Borrador actualizado automáticamente (nombre, dirección, etc.).
                </p>
              ) : null}

              {aiResearch.suggestedDraftPatch &&
              Object.keys(aiResearch.suggestedDraftPatch).length > 0 &&
              !aiResearch.draftAutoFilled ? (
                <Button size="sm" variant="secondary" className="h-8 text-xs" onClick={applyPatch}>
                  Aplicar sugerencias al borrador
                </Button>
              ) : null}

              <p className="text-[10px] text-muted-foreground">
                La IA no publica sola. Vos decidís aprobar o rechazar.
              </p>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
