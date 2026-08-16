import {
  completenessBarTone,
  completenessTone,
  placeCompleteness,
  placeQualityChecks,
  type PlaceCompletenessInput,
} from "@/lib/place-completeness"
import { cn } from "@/lib/utils"

export function PlaceCompleteness({
  place,
  compact = false,
}: {
  place: PlaceCompletenessInput
  compact?: boolean
}) {
  const pct = placeCompleteness(place)
  const missing = placeQualityChecks(place).filter((row) => !row.ok)

  return (
    <div className={compact ? "min-w-[4.5rem]" : "space-y-1"}>
      <p className={cn("text-sm font-semibold tabular-nums", completenessTone(pct))}>{pct}%</p>
      <div className="h-1.5 w-16 rounded-full bg-[#E8E1D6]">
        <div className={cn("h-full rounded-full", completenessBarTone(pct))} style={{ width: `${pct}%` }} />
      </div>
      {compact ? null : (
        <p className="text-xs text-[#6B746C]">
          {missing.length === 0
            ? "Completo"
            : `Falta: ${missing.map((row) => row.label).join(", ")}`}
        </p>
      )}
    </div>
  )
}
