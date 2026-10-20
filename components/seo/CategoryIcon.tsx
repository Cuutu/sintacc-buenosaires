import {
  Coffee,
  CookingPot,
  Croissant,
  IceCream,
  MapPin,
  ShoppingBag,
  Wine,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Íconos de línea por categoría (los mismos de la home), en vez de emojis.
 * Acepta el slug de las landings ("restaurantes") o el tipo del lugar ("restaurant").
 */
const ICONS: Record<string, LucideIcon> = {
  restaurantes: CookingPot,
  restaurant: CookingPot,
  panaderias: Croissant,
  bakery: Croissant,
  cafes: Coffee,
  cafe: Coffee,
  heladerias: IceCream,
  icecream: IceCream,
  tiendas: ShoppingBag,
  store: ShoppingBag,
  bares: Wine,
  bar: Wine,
}

export function getCategoryIcon(key: string | null | undefined): LucideIcon {
  return (key && ICONS[key]) || MapPin
}

export function CategoryIcon({
  category,
  className,
}: {
  category: string | null | undefined
  className?: string
}) {
  const Icon = getCategoryIcon(category)
  return <Icon className={cn("h-4 w-4 shrink-0", className)} strokeWidth={2} aria-hidden />
}
