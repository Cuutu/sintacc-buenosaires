"use client"

import Link from "next/link"
import { usePathname, useSearchParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useEffect, type ComponentType } from "react"
import {
  CircleUserRound,
  Heart,
  Home,
  MapPinned,
  Navigation2,
  Plus,
  ShieldCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  BOTTOM_NAV_SLOT_KEYS,
  resolveBottomNavPerfilHref,
} from "@/lib/bottom-nav-perfil"
import { recordBottomNavIntent, setAuthStatusProbe } from "@/lib/nav-telemetry"
const BASE_NAV_ITEMS = [
  { href: "/mapa", label: "Mapa", icon: MapPinned },
  { href: "/favoritos", label: "Guardados", icon: Heart },
  { href: "/sugerir", label: "Sugerir", icon: Plus, isCenter: true },
  { href: "/mapa", label: "Explorar", icon: Navigation2, isListToggle: true },
  {
    href: "/perfil",
    label: "Perfil",
    icon: CircleUserRound,
    fallbackHref: "/login",
    fallbackLabel: "Perfil",
  },
]

const ADMIN_ITEM = { href: "/admin", label: "Admin", icon: ShieldCheck }

const navItemClass =
  "group relative flex h-10 w-10 min-h-[44px] min-w-[44px] shrink items-center justify-center rounded-full transition-[transform,color,background-color] duration-200 ease-out active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:h-11 sm:w-11"

const centerItemClass =
  "group relative flex h-10 w-12 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-[1.5rem] transition-[transform,color,background-color] duration-200 ease-out active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:h-12 sm:w-14"

function NavGlyph({
  Icon,
  active,
  center = false,
}: {
  Icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>
  active: boolean
  center?: boolean
}) {
  return (
    <>
      <span
        className={cn(
          "absolute rounded-full transition-opacity duration-200",
          center ? "inset-1" : "inset-1.5",
          active
            ? "opacity-0"
            : "opacity-0 group-hover:opacity-100 group-hover:bg-olive/[0.08]"
        )}
        aria-hidden
      />
      <Icon
        className={cn(
          "relative z-[1] transition-all duration-200",
          center ? "h-6 w-6" : "h-[22px] w-[22px]",
          active
            ? "text-primary drop-shadow-none"
            : "text-olive/70 group-hover:text-olive",
          center ? "stroke-[2.2]" : "stroke-[2.05]"
        )}
        aria-hidden
      />
      {active ? (
        <span className="absolute bottom-1.5 h-1 w-4 rounded-full bg-primary" aria-hidden />
      ) : null}
    </>
  )
}

export function BottomNav() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const listOpen = searchParams.get("list") === "open"
  const isAdmin = session?.user?.role === "admin"
  const isOnMap = pathname === "/mapa"

  useEffect(() => {
    setAuthStatusProbe(status)
  }, [status])

  const rawItems = isAdmin
    ? BASE_NAV_ITEMS.map((item, i) => (i === 3 ? ADMIN_ITEM : item))
    : BASE_NAV_ITEMS

  const navItems = rawItems.map((item, index) => {
    const slotKey = BOTTOM_NAV_SLOT_KEYS[index] ?? `slot-${index}`

    if (index === 0 && isOnMap) {
      return { ...item, href: "/", label: "Home", icon: Home, slotKey }
    }

    if ("fallbackHref" in item) {
      return {
        ...item,
        href: resolveBottomNavPerfilHref(status),
        label: "Perfil",
        slotKey,
      }
    }
    return { ...item, slotKey }
  })
  const hasMapListToggle = navItems.some((item) => "isListToggle" in item && item.isListToggle)

  return (
    <nav
      className="fixed left-2 right-2 z-50 mx-auto max-w-[440px] rounded-[2rem] border border-olive/15 bg-cream/92 shadow-[0_18px_40px_-20px_rgba(45,74,52,0.35),inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-2xl sm:left-3 sm:right-3"
      style={{
        bottom: "calc(var(--bottom-nav-float-gap) + var(--bottom-nav-edge))",
      }}
      role="navigation"
      aria-label="Navegacion principal"
      data-testid="bottom-nav"
    >
      <div className="flex h-14 min-w-0 items-center justify-between gap-0.5 px-1.5 sm:justify-around sm:gap-1 sm:px-3">
        {navItems.map(({ href, label, icon: Icon, isCenter, isListToggle, slotKey }: any) => {
          const hrefStr = href ?? "/"
          const stableKey = slotKey || hrefStr
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
                  key={stableKey}
                  type="button"
                  data-nav-slot={stableKey}
                  onClick={() => {
                    const params = new URLSearchParams(searchParams.toString())
                    if (listOpen) {
                      params.delete("list")
                    } else {
                      params.set("list", "open")
                    }
                    const qs = params.toString()
                    const to = qs ? `/mapa?${qs}` : "/mapa"
                    recordBottomNavIntent(pathname || "/", to, stableKey)
                    router.replace(to, { scroll: false })
                  }}
                  className={cn(navItemClass, isExplorarActive ? "text-primary" : "text-olive/70")}
                  aria-current={isExplorarActive ? "page" : undefined}
                  aria-label={listOpen ? "Cerrar lista del mapa" : "Abrir lista del mapa"}
                  title={label}
                >
                  <NavGlyph Icon={Icon} active={isExplorarActive} />
                </button>
              )
            }

            return (
              <Link
                key={stableKey}
                data-nav-slot={stableKey}
                href="/mapa"
                onClick={() => recordBottomNavIntent(pathname || "/", "/mapa", stableKey)}
                className={cn(navItemClass, "text-olive/70")}
                aria-label={label}
                title={label}
              >
                <NavGlyph Icon={Icon} active={false} />
              </Link>
            )
          }

          if (isCenter) {
            return (
              <Link
                key={stableKey}
                data-nav-slot={stableKey}
                href={hrefStr}
                onClick={() => recordBottomNavIntent(pathname || "/", hrefStr, stableKey)}
                className={cn(
                  centerItemClass,
                  isActive ? "text-primary" : "text-olive hover:bg-olive/8"
                )}
                aria-current={isActive ? "page" : undefined}
                aria-label={label}
                title={label}
              >
                <NavGlyph Icon={Icon} active={isActive} center />
              </Link>
            )
          }

          return (
            <Link
              key={stableKey}
              data-nav-slot={stableKey}
              href={hrefStr}
              onClick={() => recordBottomNavIntent(pathname || "/", hrefStr, stableKey)}
              className={cn(navItemClass, isActive ? "text-primary" : "text-olive/70")}
              aria-current={isActive ? "page" : undefined}
              aria-label={hrefStr === "/admin" ? "Panel de administracion" : label}
              title={label}
            >
              <NavGlyph Icon={Icon} active={isActive} />
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
