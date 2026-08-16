"use client"

import { WEEK_DAYS, type WeekHours } from "@/lib/opening-hours"

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
      next[day.key] = { ...source, closed: false }
    }
    onChange(next)
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
          <div
            key={day.key}
            className="grid grid-cols-[7rem_1fr] items-center gap-3 sm:grid-cols-[8rem_auto_auto_auto]"
          >
            <p className="text-sm font-medium text-[#234A33]">{day.label}</p>
            <label className="flex h-11 items-center gap-2 text-sm text-[#6B746C]">
              <input
                type="checkbox"
                checked={row.closed}
                onChange={(e) =>
                  onChange({ ...value, [day.key]: { ...row, closed: e.target.checked } })
                }
                className="rounded border-[#E8E1D6]"
              />
              Cerrado
            </label>
            <input
              type="time"
              disabled={row.closed}
              value={row.open}
              aria-label={`${day.label} abrir`}
              onChange={(e) => onChange({ ...value, [day.key]: { ...row, open: e.target.value } })}
              className="h-11 rounded-2xl border border-[#E8E1D6] bg-[#FCFBF8] px-3 text-sm text-[#234A33] disabled:opacity-40"
            />
            <input
              type="time"
              disabled={row.closed}
              value={row.close}
              aria-label={`${day.label} cerrar`}
              onChange={(e) => onChange({ ...value, [day.key]: { ...row, close: e.target.value } })}
              className="h-11 rounded-2xl border border-[#E8E1D6] bg-[#FCFBF8] px-3 text-sm text-[#234A33] disabled:opacity-40"
            />
          </div>
        )
      })}
    </div>
  )
}
