import type { ReactNode } from "react"
import { Award, CheckCircle2, HeartHandshake, Wheat } from "lucide-react"
import { cn } from "@/lib/utils"

const BADGE_VARIANTS = {
  recommended: {
    label: "Recomendado",
    Icon: Award,
    className: "bg-terracotta/12 text-[#9a3a1b] border-terracotta/30",
  },
  dedicated: {
    label: "100% sin gluten",
    Icon: Wheat,
    className: "bg-olive/10 text-olive border-olive/20",
  },
  options: {
    label: "Tiene opciones",
    Icon: CheckCircle2,
    className: "bg-accent text-accent-foreground border-terracotta/20",
  },
  community: {
    label: "Verificado por la comunidad",
    Icon: HeartHandshake,
    className: "bg-olive/8 text-olive border-olive/15",
  },
} as const

export type BrandBadgeVariant = keyof typeof BADGE_VARIANTS

export function BrandBadge({
  variant,
  size = "md",
  className,
  children,
}: {
  variant: BrandBadgeVariant
  size?: "sm" | "md" | "lg"
  className?: string
  children?: ReactNode
}) {
  const config = BADGE_VARIANTS[variant]
  const Icon = config.Icon
  const sizeClass =
    size === "sm"
      ? "h-6 gap-1 px-2 text-[11px]"
      : size === "lg"
        ? "h-9 gap-2 px-4 text-sm"
        : "h-7 gap-1.5 px-3 text-xs"
  const iconClass = size === "lg" ? "h-4 w-4" : size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"

  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border font-semibold",
        sizeClass,
        config.className,
        className
      )}
    >
      <Icon className={iconClass} strokeWidth={1.75} aria-hidden />
      {children ?? config.label}
    </span>
  )
}
