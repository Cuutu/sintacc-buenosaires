import {
  Cake,
  ChefHat,
  Wheat,
  Package,
  Snowflake,
  UtensilsCrossed,
  Sparkles,
  Truck,
  Store,
  type LucideIcon,
} from "lucide-react"
import type { VentureCategoryId } from "@/lib/venture-constants"

const CATEGORY_ICONS: Record<VentureCategoryId, LucideIcon> = {
  pasteleria: Cake,
  viandas: ChefHat,
  panificados: Wheat,
  congelados: Snowflake,
  premezclas: Package,
  catering: UtensilsCrossed,
  productos_artesanales: Sparkles,
  envios_domicilio: Truck,
  ferias_retiro: Store,
}

export function VentureCategoryIcon({
  category,
  className,
}: {
  category: string
  className?: string
}) {
  const Icon = CATEGORY_ICONS[category as VentureCategoryId] ?? Package
  return <Icon className={className} aria-hidden />
}
