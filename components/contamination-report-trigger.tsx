"use client"

import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

type ContaminationReportTriggerProps = {
  variant?: "sidebar" | "inline"
}

export function ContaminationReportTrigger({
  variant = "sidebar",
}: ContaminationReportTriggerProps) {
  if (variant === "inline") {
    return (
      <Button
        type="button"
        className="w-full h-12 gap-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-lg shadow-amber-950/30"
      >
        <AlertTriangle className="h-5 w-5 shrink-0" />
        Reportar contaminación cruzada
      </Button>
    )
  }

  return (
    <div className="rounded-xl border border-amber-500/40 bg-gradient-to-br from-amber-950/40 to-red-950/20 p-3.5 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
          <AlertTriangle className="h-5 w-5 text-amber-300" />
        </div>
        <div>
          <p className="text-sm font-bold text-amber-100">¿Te pasó algo acá?</p>
          <p className="text-xs text-amber-200/75 mt-1 leading-relaxed">
            Contaminación cruzada, reacción, plato incorrecto. Tu reporte ayuda a otros celíacos.
          </p>
        </div>
      </div>
      <Button
        type="button"
        className="w-full h-11 gap-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold"
      >
        <AlertTriangle className="h-4 w-4 shrink-0" />
        Reportar contaminación cruzada
      </Button>
    </div>
  )
}
