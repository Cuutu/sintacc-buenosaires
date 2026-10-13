import Link from "next/link"
import { Coffee, CookingPot, Croissant, IceCream, ShoppingBag, type LucideIcon } from "lucide-react"

const CATEGORIES: readonly { label: string; href: string; Icon: LucideIcon }[] = [
  { label: "Restaurantes", href: "/mapa?type=restaurant", Icon: CookingPot },
  { label: "Cafés", href: "/mapa?type=cafe", Icon: Coffee },
  { label: "Panaderías", href: "/mapa?type=bakery", Icon: Croissant },
  { label: "Heladerías", href: "/mapa?type=icecream", Icon: IceCream },
  { label: "Tiendas", href: "/mapa?type=store", Icon: ShoppingBag },
]

/** Atajos por tipo: píldoras de 44px (toque cómodo) con ícono terracota.
 *  En mobile se desplazan de borde a borde; desde md se alinean con el buscador. */
export function CategoryChips() {
  return (
    <div
      className="w-full overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      data-overflow-allowed="hero-chips"
    >
      <nav
        aria-label="Categorías"
        className="flex w-max min-w-full justify-start gap-2 px-4 md:mx-auto md:w-full md:min-w-0 md:max-w-5xl md:flex-wrap md:px-5"
      >
        {CATEGORIES.map(({ label, href, Icon }) => (
          <Link
            key={href}
            href={href}
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-[#E6DFD2] bg-white pl-3.5 pr-4 text-sm font-extrabold text-[#2D4A34] transition-colors hover:border-olive/30 hover:bg-[#FBF8F1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive/30"
          >
            <Icon className="h-[18px] w-[18px] text-[#B84420]" strokeWidth={2} aria-hidden />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
