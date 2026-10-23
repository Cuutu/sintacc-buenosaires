"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { useEffect, type ComponentType } from "react"
import {
  CircleUserRound,
  Heart,
  Home,
  MapPinned,
  Plus,
  ShieldCheck,
  Store,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { preloadMapboxMap } from "@/lib/mapbox-preload"
import {
  BOTTOM_NAV_SLOT_KEYS,
  resolveBottomNavPerfilHref,
} from "@/lib/bottom-nav-perfil"
import { recordBottomNavIntent, setAuthStatusProbe } from "@/lib/nav-telemetry"
const BASE_NAV_ITEMS = [
  { href: "/sugerir", label: "Sugerir", icon: Plus },
  { href: "/favoritos", label: "Guardados", icon: Heart },
  { href: "/mapa", label: "Mapa", icon: MapPinned, isCenter: true },
  { href: "/emprendimientos", label: "Emprendimientos", icon: Store },
  {
    href: "/perfil",
    label: "Perfil",
    icon: CircleUserRound,
    fallbackHref: "/login",
    fallbackLabel: "Perfil",
  },
]

const ADMIN_ITEM = { href: "/admin", label: "Admin", icon: ShieldCheck }

// Rediseño Edición: barra oscura (oliva noche) con texto bajo cada ícono.
// Activo = píldora crema con contenido oliva. Inactivo = crema al 68% (≈5:1 sobre #1F3527).
const navItemClass =
  "group relative flex h-11 min-h-[44px] min-w-[44px] shrink-0 flex-col items-center justify-center gap-[3px] rounded-[1.25rem] px-1 min-[360px]:px-2 transition-[transform,color,background-color] duration-200 ease-out active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7F3EB]/70 sm:px-2.5"

const centerItemClass = navItemClass

function NavGlyph({
  Icon,
  active,
  label,
}: {
  Icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>
  active: boolean
  center?: boolean
  label: string
}) {
  return (
    <>
      <Icon
        className={cn(
          "relative z-[1] h-[21px] w-[21px] transition-colors duration-200",
          active ? "stroke-[2.2]" : "stroke-[1.9]"
        )}
        aria-hidden
      />
      <span
        className={cn(
          "relative z-[1] whitespace-nowrap text-[10px] leading-none tracking-[-0.01em] min-[360px]:text-[11px]",
          active ? "font-extrabold" : "font-bold"
        )}
        aria-hidden
      >
        {label}
      </span>
    </>
  )
}

const itemTone = (active: boolean) =>
  active
    ? "bg-[#F7F3EB] text-[#2D4A34] shadow-[0_4px_12px_-6px_rgba(0,0,0,0.45)]"
    : "text-[#F7F3EB]/[0.68] hover:text-[#F7F3EB]"

export function BottomNav() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const listOpen = searchParams.get("list") === "open"
  const isAdmin = session?.user?.role === "admin"
  const isOnMap = pathname === "/mapa"

  useEffect(() => {
    setAuthStatusProbe(status)
  }, [status])

  const rawItems = isAdmin
    ? BASE_NAV_ITEMS.map((item, i) =>
        BOTTOM_NAV_SLOT_KEYS[i] === "sugerir" ? ADMIN_ITEM : item
      )
    : BASE_NAV_ITEMS

  const navItems = rawItems.map((item, index) => {
    const slotKey = BOTTOM_NAV_SLOT_KEYS[index] ?? `slot-${index}`

    if (slotKey === "home-map" && isOnMap) {
      return { ...item, href: "/", label: "Inicio", icon: Home, slotKey }
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
      className="fixed left-2 right-2 z-50 mx-auto max-w-[440px] rounded-[2rem] bg-[#1F3527] shadow-[0_18px_40px_-14px_rgba(20,34,25,0.65)] ring-1 ring-[#F7F3EB]/15 sm:left-3 sm:right-3"
      style={{
        bottom: "calc(var(--bottom-nav-float-gap) + var(--bottom-nav-edge))",
      }}
      role="navigation"
      aria-label="Navegacion principal"
      data-testid="bottom-nav"
    >
      <div className="flex h-14 min-w-0 items-center justify-between gap-0.5 px-1.5 sm:justify-around sm:gap-1 sm:px-2">
        {navItems.map(({ href, label, icon: Icon, isCenter, isListToggle, slotKey }: any) => {
          const hrefStr = href ?? "/"
          const stableKey = slotKey || hrefStr
          // En /mapa el slot central lleva a Inicio: se muestra como acción, no como pestaña activa.
          const isMapHomeAction = isOnMap && hrefStr === "/" && label === "Inicio" && !hasMapListToggle
          const isExplorarActive = isListToggle && pathname === "/mapa"
          const isActive = isListToggle
            ? isExplorarActive
            : (!isMapHomeAction && (hrefStr === "/" ? pathname === "/" : pathname === hrefStr)) ||
              (hrefStr !== "/mapa" && hrefStr !== "/" && pathname.startsWith(hrefStr)) ||
              (hrefStr === "/mapa" && pathname === "/mapa" && !isListToggle) ||
              // Las listas viven en Guardados: en /listas y /listas/* se marca esa pestaña.
              (hrefStr === "/favoritos" && (pathname === "/listas" || pathname.startsWith("/listas/")))

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
                    // Sin ir al servidor: Next sincroniza replaceState con useSearchParams.
                    window.history.replaceState(null, "", to)
                  }}
                  className={cn(navItemClass, itemTone(isExplorarActive))}
                  aria-current={isExplorarActive ? "page" : undefined}
                  aria-label={listOpen ? "Cerrar lista del mapa" : "Abrir lista del mapa"}
                  title={label}
                >
                  <NavGlyph Icon={Icon} active={isExplorarActive} label={label} />
                </button>
              )
            }

            return (
              <Link
                key={stableKey}
                data-nav-slot={stableKey}
                href="/mapa"
                onClick={() => recordBottomNavIntent(pathname || "/", "/mapa", stableKey)}
                onPointerEnter={preloadMapboxMap}
                onPointerDown={preloadMapboxMap}
                onFocus={preloadMapboxMap}
                className={cn(navItemClass, itemTone(false))}
                aria-label={label}
                title={label}
              >
                <NavGlyph Icon={Icon} active={false} label={label} />
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
                {...(hrefStr === "/mapa"
                  ? {
                      onPointerEnter: preloadMapboxMap,
                      onPointerDown: preloadMapboxMap,
                      onFocus: preloadMapboxMap,
                    }
                  : {})}
                className={cn(centerItemClass, itemTone(isActive))}
                aria-current={isActive ? "page" : undefined}
                aria-label={label}
                title={label}
              >
                <NavGlyph Icon={Icon} active={isActive} center label={label} />
              </Link>
            )
          }

          return (
            <Link
              key={stableKey}
              data-nav-slot={stableKey}
              href={hrefStr}
              onClick={() => recordBottomNavIntent(pathname || "/", hrefStr, stableKey)}
              className={cn(navItemClass, itemTone(isActive))}
              aria-current={isActive ? "page" : undefined}
              aria-label={hrefStr === "/admin" ? "Panel de administracion" : label}
              title={label}
            >
              <NavGlyph Icon={Icon} active={isActive} label={label} />
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
