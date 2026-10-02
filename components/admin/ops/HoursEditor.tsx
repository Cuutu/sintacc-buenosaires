"use client"

import { Plus, X } from "lucide-react"
import { WEEK_DAYS, type WeekHours, type TimeRange } from "@/lib/opening-hours"

export function HoursEditor({
  value,
  onChange,
}: {
  value: WeekHours
  onChange: (next: WeekHours) => void
}) {
  const copyFromFirstOpen = () => {
    const source = WEEK_DAYS.map((d) => value[d.key]).find((row) => !row.closed)
    if (!source) return
    const next = { ...value }
    for (const day of WEEK_DAYS) {
      if (day.key === "sab" || day.key === "dom") continue
      next[day.key] = { ranges: [...source.ranges], closed: false, explicit: true }
    }
    onChange(next)
  }

  const addRange = (dayKey: (typeof WEEK_DAYS)[number]["key"]) => {
    const day = value[dayKey]
    const lastRange = day.ranges[day.ranges.length - 1]
    const newRange: TimeRange = lastRange
      ? { open: lastRange.close, close: "22:00" }
      : { open: "15:00", close: "22:00" }
    
    onChange({
      ...value,
      [dayKey]: {
        ...day,
        ranges: [...day.ranges, newRange],
        explicit: true,
      },
    })
  }

  const removeRange = (dayKey: (typeof WEEK_DAYS)[number]["key"], rangeIdx: number) => {
    const day = value[dayKey]
    if (day.ranges.length <= 1) return
    
    onChange({
      ...value,
      [dayKey]: {
        ...day,
        ranges: day.ranges.filter((_, i) => i !== rangeIdx),
        explicit: true,
      },
    })
  }

  const updateRange = (
    dayKey: (typeof WEEK_DAYS)[number]["key"],
    rangeIdx: number,
    field: "open" | "close",
    newValue: string
  ) => {
    const day = value[dayKey]
    const newRanges = [...day.ranges]
    newRanges[rangeIdx] = { ...newRanges[rangeIdx], [field]: newValue }
    
    onChange({
      ...value,
      [dayKey]: {
        ...day,
        ranges: newRanges,
        explicit: true,
      },
    })
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={copyFromFirstOpen}
          className="h-9 rounded-full border border-[#E8E1D6] px-3 text-sm font-medium text-[#234A33] transition-colors duration-150 hover:bg-[#F8F5EF]"
        >
          Copiar horarios
        </button>
      </div>
      {WEEK_DAYS.map((day) => {
        const row = value[day.key]
        return (
          <div key={day.key} className="space-y-2">
            <div className="grid grid-cols-[7rem_1fr] items-start gap-3 sm:grid-cols-[8rem_auto]">
              <p className="mt-2.5 text-sm font-medium text-[#234A33]">{day.label}</p>
              <label className="flex h-11 items-center gap-2 text-sm text-[#6B746C]">
                <input
                  type="checkbox"
                  checked={row.closed}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      [day.key]: {
                        ...row,
                        closed: e.target.checked,
                        explicit: true,
                        ranges: e.target.checked ? [] : row.ranges.length === 0 ? [{ open: "09:00", close: "18:00" }] : row.ranges,
                      },
                    })
                  }
                  className="rounded border-[#E8E1D6]"
                />
                Cerrado
              </label>
            </div>
            {!row.closed && (
              <div className="space-y-2">
                {row.ranges.map((range, rangeIdx) => (
                  <div
                    key={rangeIdx}
                    className="grid grid-cols-[7rem_1fr] items-center gap-3 sm:grid-cols-[8rem_auto_auto_auto]"
                  >
                    <div className="sm:col-start-2" />
                    <input
                      type="time"
                      value={range.open}
                      aria-label={`${day.label} rango ${rangeIdx + 1} abrir`}
                      onChange={(e) => updateRange(day.key, rangeIdx, "open", e.target.value)}
                      className="h-11 rounded-2xl border border-[#E8E1D6] bg-[#FCFBF8] px-3 text-sm text-[#234A33]"
                    />
                    <input
                      type="time"
                      value={range.close}
                      aria-label={`${day.label} rango ${rangeIdx + 1} cerrar`}
                      onChange={(e) => updateRange(day.key, rangeIdx, "close", e.target.value)}
                      className="h-11 rounded-2xl border border-[#E8E1D6] bg-[#FCFBF8] px-3 text-sm text-[#234A33]"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => addRange(day.key)}
                        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#E8E1D6] bg-[#FCFBF8] text-[#234A33] transition-colors duration-150 hover:bg-[#F8F5EF]"
                        aria-label={`Agregar rango a ${day.label}`}
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                      {row.ranges.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRange(day.key, rangeIdx)}
                          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#E8E1D6] bg-[#FCFBF8] text-[#8B5A3C] transition-colors duration-150 hover:bg-[#FEF3EF]"
                          aria-label={`Quitar rango ${rangeIdx + 1} de ${day.label}`}
                        >
                          <X className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
