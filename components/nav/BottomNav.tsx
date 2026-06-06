"use client"

import Link from "next/link"
import { usePathname, useSearchParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import type { ComponentType } from "react"
import {
  BadgePlus,
  CircleUserRound,
  Heart,
  Home,
  MapPinned,
  Navigation2,
  ShieldCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"

const BASE_NAV_ITEMS = [
  { href: "/mapa", label: "Mapa", icon: MapPinned },
  { href: "/favoritos", label: "Guardados", icon: Heart },
  { href: "/sugerir", label: "Sugerir", icon: BadgePlus, isCenter: true },
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
  "group relative flex h-12 w-12 items-center justify-center rounded-full transition-[transform,color,background-color] duration-200 ease-out active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"

const centerItemClass =
  "group relative flex h-14 w-[76px] items-center justify-center rounded-[1.75rem] transition-[transform,color,background-color] duration-200 ease-out active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"

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
            ? "opacity-100 bg-[radial-gradient(circle_at_50%_45%,rgba(16,185,129,0.24),rgba(16,185,129,0.08)_54%,transparent_74%)] ring-1 ring-primary/25"
            : "opacity-0 group-hover:opacity-100 group-hover:bg-white/[0.06]"
        )}
        aria-hidden
      />
      <Icon
        className={cn(
          "relative z-[1] transition-all duration-200",
          center ? "h-8 w-8" : "h-[26px] w-[26px]",
          active
            ? "text-primary drop-shadow-[0_0_10px_rgba(16,185,129,0.45)]"
            : "text-white/86 group-hover:text-white",
          center ? "stroke-[2.15]" : "stroke-[2.05]"
        )}
        aria-hidden
      />
      {active && (
        <span
          className={cn(
            "absolute rounded-full bg-primary shadow-[0_0_12px_rgba(16,185,129,0.75)]",
            center
              ? "right-4 top-1/2 h-1.5 w-1.5 -translate-y-1/2"
              : "bottom-1.5 h-1 w-4"
          )}
          aria-hidden
        />
      )}
    </>
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
      className="fixed left-3 right-3 z-50 mx-auto max-w-[440px] rounded-[2rem] border border-white/15 bg-[#080c0f]/64 shadow-[0_18px_60px_rgba(0,0,0,0.46),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-2xl"
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
                  className={cn(navItemClass, isExplorarActive ? "text-primary" : "text-white/86")}
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
                key="explorar-link"
                href="/mapa"
                className={cn(navItemClass, "text-white/86")}
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
                key={hrefStr}
                href={hrefStr}
                className={cn(
                  centerItemClass,
                  isActive
                    ? "bg-white/[0.08] text-primary"
                    : "bg-white/[0.10] text-white hover:bg-white/[0.14]"
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
              key={hrefStr}
              href={hrefStr}
              className={cn(navItemClass, isActive ? "text-primary" : "text-white/86")}
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
