"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { useEffect } from "react"
import { CircleUserRound, Heart, Home, MapPinned, Store, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { preloadMapboxMap } from "@/lib/mapbox-preload"
import {
  BOTTOM_NAV_SLOT_KEYS,
  isBottomNavItemActive,
  resolveBottomNavPerfilHref,
  type BottomNavSlotKey,
} from "@/lib/bottom-nav-perfil"
import { recordBottomNavIntent, setAuthStatusProbe } from "@/lib/nav-telemetry"
/**
 * Barra de abajo del celular (revisión 23/10): siempre los mismos cinco, en el mismo
 * lugar, y se marca el activo. Antes "Mapa" se convertía en "Inicio" dentro del mapa
 * y el primer lugar era "Sugerir" (sigue en la franja naranja y en el menú).
 * El panel de admin se abre desde el perfil.
 */
type NavItem = {
  slot: BottomNavSlotKey
  href: string
  label: string
  icon: LucideIcon
}

const NAV_ITEMS: NavItem[] = (
  [
  { slot: "inicio", href: "/", label: "Inicio", icon: Home },
  { slot: "mapa", href: "/mapa", label: "Mapa", icon: MapPinned },
  { slot: "favoritos", href: "/favoritos", label: "Guardados", icon: Heart },
  { slot: "emprendimientos", href: "/emprendimientos", label: "Emprendimientos", icon: Store },
  { slot: "perfil", href: "/perfil", label: "Perfil", icon: CircleUserRound },
  ] as NavItem[]
).sort((a, b) => BOTTOM_NAV_SLOT_KEYS.indexOf(a.slot) - BOTTOM_NAV_SLOT_KEYS.indexOf(b.slot))

// Rediseño Edición: barra oscura (oliva noche) con texto bajo cada ícono.
// Activo = píldora crema con contenido oliva. Inactivo = crema al 68% (≈5:1 sobre #1F3527).
const navItemClass =
  "group relative flex h-11 min-h-[44px] min-w-[44px] shrink-0 flex-col items-center justify-center gap-[3px] rounded-[1.25rem] px-1 min-[360px]:px-2 transition-[transform,color,background-color] duration-200 ease-out active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7F3EB]/70 sm:px-2.5"

function NavGlyph({
  Icon,
  active,
  label,
}: {
  Icon: LucideIcon
  active: boolean
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
  const pathname = usePathname() || "/"
  const { status } = useSession()

  useEffect(() => {
    setAuthStatusProbe(status)
  }, [status])

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
        {NAV_ITEMS.map(({ slot, href, label, icon: Icon }) => {
          const target = slot === "perfil" ? resolveBottomNavPerfilHref(status) : href
          const isActive = isBottomNavItemActive(slot, pathname)
          const preload =
            slot === "mapa"
              ? { onPointerEnter: preloadMapboxMap, onPointerDown: preloadMapboxMap, onFocus: preloadMapboxMap }
              : {}
          return (
            <Link
              key={slot}
              data-nav-slot={slot}
              href={target}
              onClick={() => recordBottomNavIntent(pathname, target, slot)}
              {...preload}
              className={cn(navItemClass, itemTone(isActive))}
              aria-current={isActive ? "page" : undefined}
              aria-label={label}
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
