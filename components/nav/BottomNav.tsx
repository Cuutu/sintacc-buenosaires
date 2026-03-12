"use client"

import Link from "next/link"
import { usePathname, useSearchParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { MapPin, Heart, PlusCircle, Compass, User, Shield } from "lucide-react"
import { cn } from "@/lib/utils"

const BASE_NAV_ITEMS = [
  { href: "/mapa", label: "Mapa", icon: MapPin },
  { href: "/favoritos", label: "Guardados", icon: Heart },
  { href: "/sugerir", label: "Sugerir", icon: PlusCircle, isCenter: true },
  { href: "/mapa", label: "Explorar", icon: Compass, isListToggle: true },
  {
    href: "/perfil",
    label: "Perfil",
    icon: User,
    fallbackHref: "/login",
    fallbackLabel: "Perfil",
  },
]

const ADMIN_ITEM = { href: "/admin", label: "Admin", icon: Shield }

export function BottomNav() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session } = useSession()
  const listOpen = searchParams.get("list") === "open"
  const isAdmin = session?.user?.role === "admin"

  // Si es admin: reemplazar el ítem Explorar (índice 3) por Admin
  const rawItems = isAdmin
    ? BASE_NAV_ITEMS.map((item, i) => (i === 3 ? ADMIN_ITEM : item))
    : BASE_NAV_ITEMS

  // Resolver href fallback para Perfil según sesión
  const navItems = rawItems.map((item) => {
    const withFallback = item as typeof item & { fallbackHref?: string; fallbackLabel?: string }
    if ("fallbackHref" in item && !session) {
      return { ...item, href: withFallback.fallbackHref ?? "/login", label: withFallback.fallbackLabel ?? item.label }
    }
    if ("fallbackHref" in item && session) {
      return { ...item, href: "/perfil", label: "Perfil" }
    }
    return item
  })

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border/50 pb-[env(safe-area-inset-bottom)]"
      role="navigation"
      aria-label="Navegación principal"
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map(({ href, label, icon: Icon, isCenter, isListToggle }: any) => {
          const hrefStr = href ?? "/"
          const isExplorarActive = isListToggle && pathname === "/mapa" && listOpen
          const isActive =
            isListToggle
              ? isExplorarActive
              : pathname === hrefStr ||
                (hrefStr !== "/mapa" && hrefStr !== "/" && pathname.startsWith(hrefStr)) ||
                (hrefStr === "/mapa" && pathname === "/mapa" && !isListToggle)

          // Ítem Explorar (toggle de lista en mapa) — solo cuando NO es admin
          if (isListToggle) {
            const isOnMap = pathname === "/mapa"
            if (isOnMap) {
              return (
                <button
                  key="explorar"
                  type="button"
                  onClick={() => {
                    const params = new URLSearchParams(searchParams.toString())
                    if (listOpen) {
                      params.delete("list")
                    } else {
                      params.set("list", "open")
                    }
                    const qs = params.toString()
                    router.replace(qs ? `/mapa?${qs}` : "/mapa", { scroll: false })
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-3 py-2 rounded-lg transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isExplorarActive
                      ? "text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  aria-label={label}
                >
                  <Icon className="h-6 w-6" aria-hidden />
                  <span className="text-[10px] font-medium mt-0.5">{label}</span>
                </button>
              )
            }
            // Fuera del mapa: link normal a /mapa
            return (
              <Link
                key="explorar-link"
                href="/mapa"
                className={cn(
                  "flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-3 py-2 rounded-lg transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  "text-muted-foreground hover:text-foreground"
                )}
                aria-label={label}
              >
                <Icon className="h-6 w-6" aria-hidden />
                <span className="text-[10px] font-medium mt-0.5">{label}</span>
              </Link>
            )
          }

          // Ítem central (Sugerir) con círculo
          if (isCenter) {
            return (
              <Link
                key={hrefStr}
                href={hrefStr}
                className={cn(
                  "flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-3 py-2 rounded-lg transition-colors relative -mt-4",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                )}
                aria-current={isActive ? "page" : undefined}
                aria-label={label}
              >
                <span className="flex items-center justify-center h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg">
                  <Icon className="h-6 w-6" aria-hidden />
                </span>
                <span className="text-[10px] font-medium mt-0.5">{label}</span>
              </Link>
            )
          }

          // Ítem Admin — con badge rojo si hay algo pendiente (futuro)
          if (hrefStr === "/admin") {
            return (
              <Link
                key="/admin"
                href="/admin"
                className={cn(
                  "flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-3 py-2 rounded-lg transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"
                )}
                aria-current={isActive ? "page" : undefined}
                aria-label="Panel de administración"
              >
                <Icon className="h-6 w-6" aria-hidden />
                <span className="text-[10px] font-medium mt-0.5">{label}</span>
              </Link>
            )
          }

          // Ítem normal
          return (
            <Link
              key={hrefStr}
              href={hrefStr}
              className={cn(
                "flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-3 py-2 rounded-lg transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                isActive ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
              aria-label={label}
            >
              <span className="flex items-center justify-center h-6 w-6 shrink-0">
                <Icon className="h-6 w-6" aria-hidden />
              </span>
              <span className="text-[10px] font-medium mt-0.5">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
