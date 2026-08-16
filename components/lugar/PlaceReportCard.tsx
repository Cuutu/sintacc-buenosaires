"use client"

import { AlertTriangle } from "lucide-react"
import { ContaminationReportForm } from "@/components/contamination-report-form"
import { placeCardClass } from "./place-detail-ui"

interface PlaceReportCardProps {
  placeId: string
  onSuccess: () => void
}

export function PlaceReportCard({ placeId, onSuccess }: PlaceReportCardProps) {
  return (
    <section className={`${placeCardClass} flex items-start gap-4 p-5`}>
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#1F4D35]/8">
        <AlertTriangle className="h-6 w-6 text-[#5F6B63]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-lg font-semibold text-[#1F4D35]">¿Hubo un problema?</p>
        <p className="mt-1 text-base leading-relaxed text-[#5F6B63]">
          Si notaste contaminación cruzada, avisá a la comunidad.
        </p>
        <div className="mt-3">
          <ContaminationReportForm
            placeId={placeId}
            onSuccess={onSuccess}
            trigger={
              <button
                type="button"
                className="inline-flex h-11 items-center justify-center rounded-2xl border-2 border-[#1F4D35]/30 px-4 text-base font-semibold text-[#1F4D35] hover:bg-[#1F4D35]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F4D35]/40"
              >
                Reportar
              </button>
            }
          />
        </div>
      </div>
    </section>
  )
}
