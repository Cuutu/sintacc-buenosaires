"use client"

import { useState } from "react"
import { ChevronDown, Clock } from "lucide-react"
import { getOpenStatusDetail } from "@/lib/opening-hours"

export function PlaceHoursToggle({ hours }: { hours: string }) {
  const [expanded, setExpanded] = useState(false)
  const detail = getOpenStatusDetail(hours)

  if (!detail) {
    return (
      <div className="flex items-start gap-3 py-4">
        <Clock className="mt-0.5 h-5 w-5 shrink-0 text-[#1F4D35]" />
        <p className="text-base text-[#1F4D35]">{hours}</p>
      </div>
    )
  }

  const hasSchedule = detail.fullSchedule.length > 0

  return (
    <div className="flex items-start gap-3 py-4">
      <Clock className="mt-0.5 h-5 w-5 shrink-0 text-[#1F4D35]" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p
              className={`text-base font-semibold ${detail.isOpen ? "text-[#2D7A4E]" : "text-[#8B5A3C]"}`}
            >
              {detail.label}
            </p>
            {detail.relativeText && (
              <p className="mt-0.5 text-sm text-[#5F6B63]">{detail.relativeText}</p>
            )}
          </div>
          {hasSchedule && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="flex h-11 shrink-0 items-center gap-1 rounded-full px-3 text-sm font-medium text-[#1F4D35] hover:bg-[#1F4D35]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F4D35]/40"
              aria-label={expanded ? "Ocultar horarios" : "Ver horarios"}
            >
              <span>Ver horarios</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
              />
            </button>
          )}
        </div>
        {hasSchedule && expanded && (
          <ul className="mt-3 space-y-1 text-sm text-[#5F6B63]">
            {detail.fullSchedule.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
