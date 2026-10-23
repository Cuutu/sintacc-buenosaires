"use client"

import { useEffect, useState } from "react"
import { Clock } from "lucide-react"
import { argentinaWeekday, getWeeklySchedule, splitOpeningHoursLines } from "@/lib/opening-hours"
import { cn } from "@/lib/utils"

/**
 * Horarios de la ficha: un solo formato ("9 a 20 h"), de lunes a domingo, con el día
 * de hoy resaltado (revisión 23/10). El estado (abierto/cerrado) va arriba, debajo del
 * nombre. Si el horario no se puede interpretar, se muestra el texto como está.
 *
 * "Hoy" depende de la fecha: se marca recién al montar (la ficha es ISR).
 */
export function PlaceHoursToggle({ hours }: { hours: string }) {
  const schedule = getWeeklySchedule(hours)
  const [today, setToday] = useState<number | null>(null)

  useEffect(() => {
    setToday(argentinaWeekday())
  }, [])

  return (
    <div className="flex items-start gap-3 py-4">
      <Clock className="mt-0.5 h-5 w-5 shrink-0 text-[#1F4D35]" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold text-[#1F4D35]">Horarios</p>
        {schedule ? (
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[15px]" data-testid="place-hours">
            {schedule.map((row) => {
              const isToday = row.day === today
              return (
                <div key={row.day} className="contents">
                  <dt className={cn(isToday ? "font-extrabold text-[#1F4D35]" : "text-[#5F6B63]")}>
                    {row.label}
                    {isToday ? <span className="sr-only"> (hoy)</span> : null}
                  </dt>
                  <dd
                    className={cn(
                      isToday ? "font-extrabold text-[#1F4D35]" : row.closed ? "text-[#8B5A3C]" : "text-[#5F6B63]"
                    )}
                    aria-current={isToday ? "date" : undefined}
                  >
                    {row.text}
                  </dd>
                </div>
              )
            })}
          </dl>
        ) : (
          <ul className="mt-2 space-y-1 text-[15px] text-[#5F6B63]">
            {splitOpeningHoursLines(hours).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
