"use client"

import { Badge } from "@/components/ui/badge"
import { features } from "@/lib/features"
import { AlertCircle, CheckCircle, AlertTriangle, HelpCircle } from "lucide-react"

interface SafetyBadgeProps {
  safetyLevel?: "dedicated_gf" | "gf_options" | "cross_contamination_risk" | "unknown"
}

export function SafetyBadge({ safetyLevel }: SafetyBadgeProps) {
  if (!features.safetyLevel) return null
  const level = safetyLevel ?? "unknown"

  const config = {
    dedicated_gf: {
      label: "100% sin gluten",
      variant: "default" as const,
      icon: CheckCircle,
      color: "bg-green-500",
    },
    gf_options: {
      label: "Opciones sin gluten",
      variant: "secondary" as const,
      icon: AlertCircle,
      color: "bg-yellow-500",
    },
    cross_contamination_risk: {
      label: "Riesgo Contaminación",
      variant: "destructive" as const,
      icon: AlertTriangle,
      color: "bg-red-500",
    },
    unknown: {
      label: "Sin info verificada",
      variant: "outline" as const,
      icon: HelpCircle,
      color: "bg-gray-500",
    },
  }

  const { label, variant, icon: Icon } = config[level]

  return (
    <Badge variant={variant} className="flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  )
}
