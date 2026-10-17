import { cn } from "@/lib/utils"
import { monthChange, type MonthStamps } from "@/lib/wallet/month-stats"

/** Sellos por mes (últimos 6). Sirve en /local y en /admin/tarjetas: no usa hooks. */
export function MonthlyStamps({ months, className }: { months: MonthStamps[]; className?: string }) {
  if (months.length === 0) return null
  const current = months[months.length - 1]
  const previous = months[months.length - 2]
  const change = previous ? monthChange(current.stamps, previous.stamps) : null
  const max = Math.max(1, ...months.map((m) => m.stamps))
  return (
    <figure className={cn("rounded-xl bg-[#F8F5EF] p-3 text-[#234A33]", className)}>
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs text-[#6B746C]">
        <span>Sellos por mes</span>
        <span>
          <strong className="text-base text-[#234A33]">{current.stamps}</strong> este mes
          {change && <span className="ml-1">({change} vs. {previous.label})</span>}
        </span>
      </figcaption>
      <ol className="mt-3 grid h-24 grid-cols-6 items-end gap-2" aria-label="Sellos de los últimos 6 meses">
        {months.map((m) => (
          <li key={m.month} className="flex h-full flex-col items-center justify-end gap-1">
            <span className="text-[11px] font-semibold">{m.stamps > 0 ? m.stamps : ""}</span>
            <span
              aria-hidden
              className={cn("w-full rounded-t-md", m.current ? "bg-[#B84420]" : "bg-[#234A33]/70")}
              style={{ height: `${Math.max(4, (m.stamps / max) * 56)}px`, opacity: m.stamps === 0 ? 0.25 : 1 }}
            />
            <span className={cn("text-[11px]", m.current ? "font-bold text-[#B84420]" : "text-[#6B746C]")}>
              {m.label}
            </span>
            <span className="sr-only">
              {m.label}: {m.stamps} sellos, {m.customers} clientes, {m.redeems} canjes
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-[11px] text-[#6B746C]">
        Este mes: {current.customers} {current.customers === 1 ? "cliente" : "clientes"} · {current.redeems}{" "}
        {current.redeems === 1 ? "premio canjeado" : "premios canjeados"}
      </p>
    </figure>
  )
}
