"use client"

import Link from "next/link"
import { usePathname, useSearchParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { MapPin, Heart, PlusCircle, Compass, User, Shield, Home } from "lucide-react"
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

const iconButtonClass =
  "relative flex h-12 w-12 items-center justify-center rounded-full transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"

const inactiveIconClass = "text-white/78 hover:bg-white/10 hover:text-white"
const activeIconClass =
  "bg-primary/16 text-primary ring-1 ring-primary/45 shadow-[0_0_24px_rgba(16,185,129,0.28),inset_0_1px_0_rgba(255,255,255,0.14)]"

function ActiveDot({ className }: { className?: string }) {
  return (
    <span
      className={cn("absolute h-1.5 w-5 rounded-full bg-primary shadow-[0_0_12px_rgba(16,185,129,0.8)]", className)}
      aria-hidden
    />
  )
}

export function BottomNav() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session } = useSession()
  const listOpen = searchParams.get("list") === "open"
  const isAdmin = session?.user?.role === "admin"
  const isOnMap = pathname === "/mapa"

  const rawItems = isAdmin
    ? BASE_NAV_ITEMS.map((item, i) => (i === 3 ? ADMIN_ITEM : item))
    : BASE_NAV_ITEMS

  const navItems = rawItems.map((item, index) => {
    if (index === 0 && isOnMap) {
      return { ...item, href: "/", label: "Home", icon: Home }
    }

    const withFallback = item as typeof item & { fallbackHref?: string; fallbackLabel?: string }
    if ("fallbackHref" in item && !session) {
      return {
        ...item,
        href: withFallback.fallbackHref ?? "/login",
        label: withFallback.fallbackLabel ?? item.label,
      }
    }
    if ("fallbackHref" in item && session) {
      return { ...item, href: "/perfil", label: "Perfil" }
    }
    return item
  })
  const hasMapListToggle = navItems.some((item) => "isListToggle" in item && item.isListToggle)

  return (
    <nav
      className="fixed left-3 right-3 z-50 mx-auto max-w-[440px] rounded-[2rem] border border-white/15 bg-[#080c0f]/68 shadow-[0_18px_60px_rgba(0,0,0,0.48),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-2xl"
      style={{ bottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      role="navigation"
      aria-label="Navegacion principal"
    >
      <div className="flex h-16 items-center justify-around gap-1 px-3">
        {navItems.map(({ href, label, icon: Icon, isCenter, isListToggle }: any) => {
          const hrefStr = href ?? "/"
          const isMapHomeAction = isOnMap && hrefStr === "/" && label === "Home" && !hasMapListToggle
          const isExplorarActive = isListToggle && pathname === "/mapa"
          const isActive = isListToggle
            ? isExplorarActive
            : isMapHomeAction ||
              (hrefStr === "/" ? pathname === "/" : pathname === hrefStr) ||
              (hrefStr !== "/mapa" && hrefStr !== "/" && pathname.startsWith(hrefStr)) ||
              (hrefStr === "/mapa" && pathname === "/mapa" && !isListToggle)

          if (isListToggle) {
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
                    iconButtonClass,
                    isExplorarActive ? activeIconClass : inactiveIconClass
                  )}
                  aria-current={isExplorarActive ? "page" : undefined}
                  aria-label={listOpen ? "Cerrar lista del mapa" : "Abrir lista del mapa"}
                  title={label}
                >
                  <Icon className="h-7 w-7 stroke-[2.25]" aria-hidden />
                  {isExplorarActive && <ActiveDot className="bottom-1.5" />}
                </button>
              )
            }

            return (
              <Link
                key="explorar-link"
                href="/mapa"
                className={cn(iconButtonClass, inactiveIconClass)}
                aria-label={label}
                title={label}
              >
                <Icon className="h-7 w-7 stroke-[2.25]" aria-hidden />
              </Link>
            )
          }

          if (isCenter) {
            return (
              <Link
                key={hrefStr}
                href={hrefStr}
                className={cn(
                  "relative flex h-14 w-[76px] items-center justify-center rounded-[1.75rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  isActive
                    ? "bg-primary/18 text-primary ring-1 ring-primary/40 shadow-[0_0_26px_rgba(16,185,129,0.28),inset_0_1px_0_rgba(255,255,255,0.16)]"
                    : "bg-white/14 text-white hover:bg-white/20"
                )}
                aria-current={isActive ? "page" : undefined}
                aria-label={label}
                title={label}
              >
                <Icon className="h-8 w-8 stroke-[2.25]" aria-hidden />
                {isActive && <ActiveDot className="right-4 top-1/2 -translate-y-1/2" />}
              </Link>
            )
          }

          if (hrefStr === "/admin") {
            return (
              <Link
                key="/admin"
                href="/admin"
                className={cn(iconButtonClass, isActive ? activeIconClass : inactiveIconClass)}
                aria-current={isActive ? "page" : undefined}
                aria-label="Panel de administracion"
                title={label}
              >
                <Icon className="h-7 w-7 stroke-[2.25]" aria-hidden />
                {isActive && <ActiveDot className="bottom-1.5" />}
              </Link>
            )
          }

          return (
            <Link
              key={hrefStr}
              href={hrefStr}
              className={cn(iconButtonClass, isActive ? activeIconClass : inactiveIconClass)}
              aria-current={isActive ? "page" : undefined}
              aria-label={label}
              title={label}
            >
              <Icon className="h-7 w-7 stroke-[2.25]" aria-hidden />
              {isActive && <ActiveDot className="bottom-1.5" />}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
