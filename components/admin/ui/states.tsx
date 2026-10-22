import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/** Carga: filas de esqueleto (mismo aspecto en todas las pantallas, en vez de "Cargando…"). */
export function AdminListSkeleton({ rows = 5, label = "Cargando…", className }: { rows?: number; label?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={cn("divide-y divide-line", className)}>
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-5 py-4" aria-hidden>
          <div className="h-12 w-12 shrink-0 animate-pulse rounded-2xl bg-line" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3.5 w-2/5 animate-pulse rounded-full bg-line" />
            <div className="h-3 w-3/5 animate-pulse rounded-full bg-line opacity-70" />
          </div>
          <div className="hidden h-6 w-20 animate-pulse rounded-full bg-line sm:block" />
        </div>
      ))}
    </div>
  )
}

/** Lista vacía: una línea que dice qué pasa y, si hace falta, qué hacer. */
export function AdminEmptyState({ title, hint, action, className }: { title: string; hint?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-2 px-5 py-10 text-center", className)}>
      <p className="text-sm font-semibold text-olive">{title}</p>
      {hint ? <p className="max-w-md text-sm text-ink-muted">{hint}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}

/** Número clave: etiqueta en una línea, valor grande y una pista opcional. Todas del mismo alto. */
export function StatTile({
  label,
  value,
  hint,
  tone = "default",
  className,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  tone?: "default" | "warning"
  className?: string
}) {
  return (
    <div className={cn("flex h-full min-w-0 flex-col rounded-2xl border border-line bg-cream-card p-4", className)}>
      <p className="truncate text-sm font-medium text-ink-muted" title={label}>
        {label}
      </p>
      <p className={cn("mt-1 text-[28px] font-extrabold leading-tight tabular-nums", tone === "warning" ? "text-warning" : "text-olive")}>
        {value}
      </p>
      {hint ? <p className="mt-auto pt-1 text-xs text-ink-muted">{hint}</p> : null}
    </div>
  )
}
