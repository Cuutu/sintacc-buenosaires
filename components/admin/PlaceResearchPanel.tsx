"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronDown, Loader2, Pencil, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { TYPES } from "@/lib/constants"
import type { AiResearchItem, DuplicateWarningItem } from "@/components/admin/types"
import { DuplicateWarningsList } from "@/components/admin/ResearchPanelShared"

const POLL_MS = 5000
const STALE_MS = 90_000

type Props = {
  placeId: string
  placeName?: string
  aiResearch?: AiResearchItem
  onUpdated: () => void
  onEditPlace?: (id: string) => void
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
  if (ai.status === "queued") return "En cola"
  if (ai.status === "done") return ai.needsAdmin ? "Revisión manual" : "Informe listo"
  if (ai.status === "failed") return "Falló"
  return "Pendiente"
}

function safetyLabel(level?: string | null): string {
  if (level === "dedicated_gf") return "100% sin TACC"
  if (level === "gf_options") return "Opciones sin TACC"
  if (level === "cross_contamination_risk") return "Riesgo contaminación"
  return "Sin evidencia clara"
}

function isRunningStale(ai?: AiResearchItem): boolean {
  if (ai?.status !== "running") return false
  if (!ai.startedAt) return true
  return Date.now() - new Date(ai.startedAt).getTime() > STALE_MS
}

function patchPreviewLines(patch?: Record<string, unknown>): string[] {
  if (!patch) return []
  const lines: string[] = []
  if (patch.name) lines.push(`Nombre: ${String(patch.name)}`)
  if (patch.address) lines.push(`Dirección: ${String(patch.address)}`)
  if (patch.neighborhood) lines.push(`Barrio: ${String(patch.neighborhood)}`)
  if (patch.type) {
    const label = TYPES.find((t) => t.value === patch.type)?.label ?? String(patch.type)
    lines.push(`Tipo: ${label}`)
  }
  if (patch.openingHours) lines.push(`Horarios: ${String(patch.openingHours)}`)
  if (patch.safetyLevel) lines.push(`TACC: ${safetyLabel(String(patch.safetyLevel))}`)
  const contact = patch.contact as Record<string, string> | undefined
  if (contact?.url) lines.push(`Web: ${contact.url}`)
  if (contact?.phone) lines.push(`Tel: ${contact.phone}`)
  if (contact?.instagram) lines.push(`IG: ${contact.instagram}`)
  return lines
}

export function PlaceResearchPanel({
  placeId,
  placeName,
  aiResearch,
  onUpdated,
  onEditPlace,
}: Props) {
  const [open, setOpen] = useState(
    aiResearch?.status === "done" || aiResearch?.status === "failed"
  )
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
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
      const res = await fetch(`/api/admin/places/${placeId}/research`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al investigar")
      toast.success(
        data.aiEnrichment?.draftAutoFilled
          ? "Investigación lista — ficha completada con Google"
          : "Investigación completada"
      )
      if (data.aiEnrichment?.duplicateWarnings?.length) {
        const exact = data.aiEnrichment.duplicateWarnings.some(
          (warning: DuplicateWarningItem) => warning.matchLevel === "exact"
        )
        toast.warning(
          exact
            ? "Atención: posible duplicado exacto en el mapa"
            : "Posible duplicado detectado — revisá antes de guardar"
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

  const applyPatch = async (includeSafety = false) => {
    setApplying(true)
    try {
      const res = await fetch(`/api/admin/places/${placeId}/research`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "apply_patch",
          includeRecommendedSafety: includeSafety,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al aplicar")
      toast.success(
        includeSafety
          ? "Datos IA y clasificación TACC aplicados"
          : "Datos sugeridos aplicados al lugar"
      )
      onUpdated()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al aplicar")
    } finally {
      setApplying(false)
    }
  }

  const running =
    (aiResearch?.status === "running" || aiResearch?.status === "queued") && !staleRunning
  const patchLines = patchPreviewLines(aiResearch?.suggestedDraftPatch)
  const hasPatch = patchLines.length > 0
  const canApplySafety =
    aiResearch?.status === "done" &&
    aiResearch.recommendedSafetyLevel &&
    (aiResearch.gfConfidence ?? 0) >= 50

  return (
    <div className="mt-2 rounded-lg border border-border/80 bg-card/40">
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
          {staleRunning ? "Investigación colgada" : statusLabel(aiResearch)}
        </span>
        {onEditPlace ? (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs gap-1"
            onClick={() => onEditPlace(placeId)}
          >
            <Pencil className="h-3 w-3" />
            Editar ficha
          </Button>
        ) : null}
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
            ? "Reintentar"
            : aiResearch?.status === "done" || aiResearch?.status === "failed"
              ? "Re-investigar"
              : "Investigar"}
        </Button>
      </div>

      {staleRunning ? (
        <p className="px-3 py-2 text-xs text-amber-400">
          La investigación no terminó. Tocá reintentar.
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

      {aiResearch?.status === "done" || aiResearch?.status === "failed" ? (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex w-full items-center gap-1 px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
            />
            Informe IA{placeName ? ` · ${placeName}` : ""}
            {aiResearch.costUsd != null ? (
              <span className="ml-1 text-[10px]">· ${aiResearch.costUsd.toFixed(3)}</span>
            ) : null}
          </button>
          {open ? (
            <div className="px-3 pb-3 space-y-3 text-xs">
              {aiResearch.summary ? (
                <p className="text-foreground/90 leading-relaxed">{aiResearch.summary}</p>
              ) : null}

              {aiResearch.status === "done" ? (
                <>
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
                      Ficha actualizada automáticamente con datos de Google.
                    </p>
                  ) : null}

                  {hasPatch ? (
                    <div className="rounded border border-border/60 bg-background/30 px-2 py-2 space-y-1">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase">
                        Datos sugeridos
                      </p>
                      {patchLines.map((line) => (
                        <p key={line} className="text-foreground/80">
                          {line}
                        </p>
                      ))}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    {hasPatch && !aiResearch.draftAutoFilled ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 text-xs"
                        disabled={applying}
                        onClick={() => applyPatch(false)}
                      >
                        {applying ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : null}
                        Aplicar datos IA
                      </Button>
                    ) : null}
                    {canApplySafety ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        disabled={applying}
                        onClick={() => applyPatch(true)}
                      >
                        Aplicar TACC recomendado
                      </Button>
                    ) : null}
                  </div>
                </>
              ) : null}

              <p className="text-[10px] text-muted-foreground">
                La IA no publica sola. Revisá evidencia y editá la ficha si hace falta.
              </p>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
