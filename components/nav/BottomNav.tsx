"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { Home, MapPin, Heart, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { features } from "@/lib/features"

const BASE_ITEMS = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/mapa", label: "Mapa", icon: MapPin },
  ...(features.favorites ? [{ href: "/favoritos", label: "Favoritos", icon: Heart }] : []),
  { href: "/login", label: "Perfil", icon: User },
]

export function BottomNav() {
  const pathname = usePathname()
  const { data: session } = useSession()

  const navItems = BASE_ITEMS.map((item) => {
    if (item.href === "/login" && session) {
      return { ...item, href: "/perfil", label: "Perfil" }
    }
    return item
  })

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border/50 pb-[env(safe-area-inset-bottom)]"
      role="navigation"
      aria-label="Navegación principal"
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href === "/" && pathname === "/")
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-4 py-2 rounded-lg transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                isActive
                  ? "text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
              aria-label={label}
            >
              <Icon className="h-6 w-6 shrink-0" aria-hidden />
              <span className="text-[11px] font-medium mt-0.5">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
