import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/** Encabezado único de las pantallas del admin: título, bajada y acciones. */
export function AdminPageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string
  description?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <header className={cn("mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="font-display text-[28px] font-extrabold leading-tight tracking-[-0.03em] text-olive">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-base text-ink-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  )
}

/** Título de una tarjeta o sección: mismo tamaño en todas. */
export function AdminSectionTitle({ children, hint, className }: { children: ReactNode; hint?: ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <h2 className="text-base font-bold text-olive">{children}</h2>
      {hint ? <p className="mt-0.5 text-sm text-ink-muted">{hint}</p> : null}
    </div>
  )
}
