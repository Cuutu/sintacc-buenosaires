import { cn } from "@/lib/utils"
import type { WeekVisits } from "@/lib/wallet/visits"

/** Barras simples de clientes por día (última semana). */
export function VisitsChart({ week }: { week: WeekVisits }) {
  const { days, total } = week
  const max = Math.max(1, ...days.map((d) => d.visits))
  return (
    <figure className="rounded-xl bg-[#F8F5EF] p-3">
      <figcaption className="flex items-baseline justify-between text-xs text-olive/70">
        <span>Clientes que sumaron sellos</span>
        <span>
          <strong className="text-base text-olive">{total}</strong> {total === 1 ? "cliente" : "clientes"} en 7 días
        </span>
      </figcaption>
      <ol className="mt-3 grid h-28 grid-cols-7 items-end gap-2" aria-label="Clientes por día, últimos 7 días">
        {days.map((d) => (
          <li key={d.date} className="flex h-full flex-col items-center justify-end gap-1">
            <span className="text-[11px] font-semibold text-olive/80">{d.visits > 0 ? d.visits : ""}</span>
            <span
              aria-hidden
              className={cn("w-full rounded-t-md", d.today ? "bg-[#B84420]" : "bg-olive/70")}
              style={{ height: `${Math.max(4, (d.visits / max) * 72)}px`, opacity: d.visits === 0 ? 0.25 : 1 }}
            />
            <span className={cn("text-[11px]", d.today ? "font-bold text-[#B84420]" : "text-olive/70")}>
              {d.today ? "Hoy" : d.label}
            </span>
            <span className="sr-only">
              {d.today ? "Hoy" : d.label}: {d.visits} {d.visits === 1 ? "cliente" : "clientes"}
            </span>
          </li>
        ))}
      </ol>
    </figure>
  )
}
