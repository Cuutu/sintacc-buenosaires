"use client"

import { CheckCircle, Circle, Award, LayoutGrid, HelpCircle, LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { getTagBadgeConfig } from "@/lib/constants"

const TAG_ICONS: Record<string, LucideIcon> = {
  "100_gf": CheckCircle,
  opciones_sin_tacc: Circle,
  certificado_sin_tacc: Award,
  cocina_separada: LayoutGrid,
  sin_info: HelpCircle,
}

interface TagBadgeProps {
  tag: string
  size?: "sm" | "default"
  className?: string
}

export function TagBadge({ tag, size = "default", className }: TagBadgeProps) {
  const config = getTagBadgeConfig(tag)
  const Icon = TAG_ICONS[tag] ?? HelpCircle

  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-xs gap-1" : "px-3 py-1.5 text-sm gap-2 min-h-[44px]"
  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4"

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border font-medium",
        sizeClasses,
        config.className,
        className
      )}
    >
      <Icon className={cn(iconSize, "shrink-0")} />
      {config.label}
    </span>
  )
}
