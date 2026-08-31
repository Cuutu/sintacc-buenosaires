"use client"

import { useState } from "react"
import { ChevronDown, Clock } from "lucide-react"
import { isOpenNow } from "@/lib/opening-hours"

export function PlaceHoursToggle({ hours }: { hours: string }) {
  const [open, setOpen] = useState(false)
  const status = isOpenNow(hours)
  const parts = hours.split(/[,;]/).map((p) => p.trim()).filter(Boolean)
  const summary = parts[0] ?? hours
  const expandable = parts.length > 1 || hours.length > 42

  return (
    <div className="flex items-start gap-3 py-4">
      <Clock className="mt-0.5 h-5 w-5 shrink-0 text-[#1F4D35]" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-base text-[#1F4D35]">
              {expandable ? (open ? "Horarios" : summary) : hours}
            </p>
            {status != null && (
              <p className="mt-1 text-base font-semibold text-[#1F4D35]">
                {status ? "Abierto ahora" : "Cerrado ahora"}
              </p>
            )}
          </div>
          {expandable && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#1F4D35] hover:bg-[#1F4D35]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F4D35]/40"
              aria-label={open ? "Ocultar horarios" : "Ver horarios"}
            >
              <ChevronDown className={`h-5 w-5 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
          )}
        </div>
        {expandable && open && (
          parts.length > 1 ? (
            <ul className="mt-2 space-y-1 text-base text-[#5F6B63]">
              {parts.map((part) => (
                <li key={part}>{part}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-base text-[#5F6B63]">{hours}</p>
          )
        )}
      </div>
    </div>
  )
}
