"use client"

import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ContaminationReportTriggerProps = {
  className?: string
}

export function ContaminationReportTrigger({ className }: ContaminationReportTriggerProps) {
  return (
    <Button
      type="button"
      variant="outline"
      className={cn(
        "w-full gap-2 h-auto min-h-[44px] py-2.5 px-3 whitespace-normal text-center leading-snug",
        "border-amber-500/35 bg-amber-950/20 text-amber-100",
        "hover:bg-amber-500/15 hover:text-amber-50 hover:border-amber-500/50",
        className
      )}
    >
      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
      <span>Reportar contaminación cruzada</span>
    </Button>
  )
}
