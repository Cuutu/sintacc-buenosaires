import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Etiquetas de estado: fondo suave, sin borde ni hover, para que no parezcan
 * botones. Verde = bien / publicado, ámbar = pendiente / a revisar, rojo = problema.
 */
export type StatusTone = "success" | "warning" | "danger" | "neutral"

const TONES: Record<StatusTone, string> = {
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-olive/8 text-olive",
}

const DOTS: Record<StatusTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  neutral: "bg-olive/50",
}

export function StatusBadge({
  tone = "neutral",
  dot = true,
  className,
  children,
}: {
  tone?: StatusTone
  dot?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-semibold",
        TONES[tone],
        className
      )}
    >
      {dot ? <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", DOTS[tone])} /> : null}
      {children}
    </span>
  )
}

/** Dato descriptivo (Delivery, Retiro, Instagram): plano, cuadrado, nada clicable. */
export function Tag({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center whitespace-nowrap rounded-md bg-olive/6 px-2 text-xs font-medium text-ink-muted",
        className
      )}
    >
      {children}
    </span>
  )
}

/** Publicado / Pendiente de un lugar o emprendimiento. */
export function PublishStatusBadge({ status }: { status?: string }) {
  return status === "approved" ? (
    <StatusBadge tone="success">Publicado</StatusBadge>
  ) : (
    <StatusBadge tone="warning">Pendiente</StatusBadge>
  )
}
