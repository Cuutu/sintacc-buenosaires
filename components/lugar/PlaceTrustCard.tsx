import { Shield, ShieldAlert } from "lucide-react"
import { placeCardClass } from "./place-detail-ui"

interface PlaceTrustCardProps {
  reportCount: number
  isDedicated: boolean
}

export function PlaceTrustCard({ reportCount, isDedicated }: PlaceTrustCardProps) {
  if (reportCount > 0) {
    return (
      <div className={`${placeCardClass} flex items-start gap-4 p-5`}>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#C85A2E]/10">
          <ShieldAlert className="h-6 w-6 text-[#C85A2E]" />
        </div>
        <div>
          <p className="text-lg font-semibold text-[#1F4D35]">
            {reportCount} {reportCount === 1 ? "reporte" : "reportes"} de contaminación
          </p>
          <p className="mt-1 text-base leading-relaxed text-[#5F6B63]">
            Confirmá con el lugar antes de ir.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`${placeCardClass} flex items-start gap-4 p-5`}>
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#1F4D35]/10">
        <Shield className="h-6 w-6 text-[#1F4D35]" />
      </div>
      <div>
        <p className="text-lg font-semibold text-[#1F4D35]">
          Sin reportes de contaminación cruzada
        </p>
        <p className="mt-1 text-base leading-relaxed text-[#5F6B63]">
          {isDedicated
            ? "Clasificado 100% Sin TACC. Ningún usuario reportó problemas."
            : "Ningún usuario reportó problemas."}
        </p>
      </div>
    </div>
  )
}
