import Link from "next/link"

const CATEGORIES = [
  { label: "Restaurantes", href: "/mapa?type=restaurant" },
  { label: "Cafés", href: "/mapa?type=cafe" },
  { label: "Panaderías", href: "/mapa?type=bakery" },
  { label: "Tiendas", href: "/mapa?type=store" },
  { label: "Heladerías", href: "/mapa?type=icecream" },
] as const

export function CategoryChips() {
  return (
    <div
      className="w-full overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      data-overflow-allowed="hero-chips"
    >
      <nav
        aria-label="Categorías"
        className="flex w-max min-w-full justify-start gap-1.5 pr-3 sm:w-full sm:flex-wrap sm:justify-center sm:pr-0"
      >
        {CATEGORIES.map((cat) => (
          <Link
            key={cat.href}
            href={cat.href}
            className="inline-flex h-8 shrink-0 items-center rounded-full border border-[#D9DED4] bg-white px-3 text-[13px] font-medium text-[#2D4A34] transition-colors hover:border-olive/35 hover:bg-[#F6F1E8] sm:h-9 sm:px-3.5 sm:text-sm"
          >
            {cat.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
