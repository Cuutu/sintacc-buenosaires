"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { MapPin, Heart, PlusCircle, Compass, User } from "lucide-react"
import { cn } from "@/lib/utils"

const MOBILE_NAV_ITEMS = [
  { href: "/mapa", label: "Mapa", icon: MapPin },
  { href: "/favoritos", label: "Guardados", icon: Heart },
  { href: "/sugerir", label: "Sugerir", icon: PlusCircle, isCenter: true },
  { href: "/explorar", label: "Explorar", icon: Compass },
  {
    href: "/perfil",
    label: "Perfil",
    icon: User,
    fallbackHref: "/login",
    fallbackLabel: "Perfil",
  },
]

export function BottomNav() {
  const pathname = usePathname()
  const { data: session } = useSession()

  const navItems = MOBILE_NAV_ITEMS.map((item) => {
    if ("fallbackHref" in item && !session) {
      return {
        ...item,
        href: item.fallbackHref ?? "/login",
        label: item.fallbackLabel ?? item.label,
      }
    }
    if ("fallbackHref" in item && session) {
      return { ...item, href: "/perfil", label: "Perfil" }
    }
    return item
  })

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border/50 pb-[env(safe-area-inset-bottom)]"
      role="navigation"
      aria-label="Navegación principal"
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map(({ href, label, icon: Icon, isCenter }) => {
          const hrefStr = href ?? "/"
          const isActive =
            pathname === hrefStr ||
            (hrefStr !== "/mapa" && pathname.startsWith(hrefStr)) ||
            (hrefStr === "/mapa" && pathname === "/mapa")

          return (
            <Link
              key={hrefStr}
              href={hrefStr}
              className={cn(
                "flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-3 py-2 rounded-lg transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                isActive
                  ? "text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground",
                isCenter && "relative -mt-4"
              )}
              aria-current={isActive ? "page" : undefined}
              aria-label={label}
            >
              <span
                className={cn(
                  "flex items-center justify-center rounded-full transition-colors",
                  isCenter
                    ? "h-12 w-12 bg-primary text-primary-foreground shadow-lg"
                    : "h-6 w-6 shrink-0"
                )}
              >
                <Icon className={isCenter ? "h-6 w-6" : "h-6 w-6"} aria-hidden />
              </span>
              <span className="text-[10px] font-medium mt-0.5">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
