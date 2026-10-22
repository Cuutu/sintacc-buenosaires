"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { ArrowLeft, ChevronDown, MoreHorizontal, Plus, Search } from "lucide-react"
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { ADMIN_MOBILE_PRIMARY, ADMIN_NAV, ADMIN_NAV_GROUPS, isAdminNavActive, type AdminNavItem } from "./admin-nav"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { adminButtonClass } from "@/components/admin/ui/button"
import { formatCount } from "@/lib/admin-format"
import { AdminCommandSearch } from "./AdminCommandSearch"
import type { AdminCounts } from "@/lib/admin-ops"
import { adminUi } from "@/lib/admin-ui"
import { BrandLogo } from "@/components/brand/BrandLogo"
import { cn } from "@/lib/utils"

const COUNTS_POLL_MS = 5 * 60_000

export function AdminOpsShell({
  children,
  initialCounts,
}: {
  children: React.ReactNode
  initialCounts: AdminCounts
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [counts, setCounts] = useState(initialCounts)
  const [open, setOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setInterval> | null = null
    const isVisible = () => document.visibilityState === "visible"
    const refresh = () => {
      if (!isVisible()) return
      fetch("/api/admin/counts", { cache: "no-store" })
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (active && data) setCounts(data) })
        .catch(() => undefined)
    }
    // Cada invocación mantiene viva la función en Vercel (ver lib/mongodb.ts): poll lento y sólo con la pestaña visible.
    const startPolling = () => {
      if (timer === null) timer = setInterval(refresh, COUNTS_POLL_MS)
    }
    const stopPolling = () => {
      if (timer !== null) clearInterval(timer)
      timer = null
    }
    const onVisibilityChange = () => {
      if (isVisible()) {
        refresh()
        startPolling()
      } else {
        stopPolling()
      }
    }
    if (isVisible()) startPolling()
    window.addEventListener("admin:counts-changed", refresh)
    document.addEventListener("visibilitychange", onVisibilityChange)
    return () => {
      active = false
      stopPolling()
      window.removeEventListener("admin:counts-changed", refresh)
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const badgeFor = (key?: keyof AdminCounts) => {
    if (!key) return 0
    return Number(counts[key] ?? 0)
  }

  /** Contador de pendientes: oliva (no terracota, que queda para la acción principal). */
  const navCount = (item: AdminNavItem, active: boolean, compact = false) => {
    const count = badgeFor(item.badge)
    if (count <= 0) return null
    return (
      <span
        className={cn(
          "inline-flex min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums",
          compact ? "h-5" : "h-6",
          active ? "bg-cream text-olive" : "bg-olive text-cream"
        )}
      >
        {count > 99 ? "99+" : formatCount(count)}
        <span className="sr-only"> {item.badgeLabel ?? "pendientes"}</span>
      </span>
    )
  }

  return (
    <div className={cn("admin-ops min-h-screen text-olive [&_button]:min-h-11 [&_input:not([type=checkbox])]:min-h-11 [&_select]:min-h-11", adminUi.bg)}>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[240px] border-r border-line bg-cream lg:flex lg:flex-col">
        <div className="px-5 pb-4 pt-6">
          <Link href="/" className="flex items-center gap-2" aria-label="Volver a CeliMap">
            <BrandLogo markOnly size="xs" />
            <div>
              <p className="font-display text-sm font-extrabold tracking-[-0.03em] text-olive">
                CeliMap
              </p>
              <p className="text-[11px] font-medium text-ink-muted">Operaciones</p>
            </div>
          </Link>
        </div>
        <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-4" aria-label="Admin">
          {ADMIN_NAV_GROUPS.map((group) => (
            <div key={group.label ?? "inicio"}>
              {group.label ? (
                <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">{group.label}</p>
              ) : null}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isAdminNavActive(item, pathname)
                  const Icon = item.icon
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex h-11 items-center gap-3 rounded-2xl px-3 text-sm transition-colors duration-150",
                          active ? "bg-olive font-semibold text-cream" : "text-olive hover:bg-olive/8"
                        )}
                      >
                        <Icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-cream" : "text-ink-muted")} aria-hidden />
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        {navCount(item, active)}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-t border-line p-3">
          <Link
            href="/"
            className="flex h-11 items-center gap-2 rounded-2xl px-3 text-sm font-medium text-olive hover:bg-cream-card"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a CeliMap
          </Link>
        </div>
      </aside>

      <div className="lg:pl-[240px]">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-line bg-cream/92 px-4 backdrop-blur-md md:px-8">
          <Link
            href="/"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-line text-olive hover:bg-cream-card lg:hidden"
            aria-label="Volver a CeliMap"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-2xl border border-line bg-cream-card px-3 text-sm text-ink-muted lg:max-w-md"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="truncate">Buscar lugares, emprendimientos, mensajes…</span>
            <kbd className="ml-auto hidden rounded-md border border-line px-1.5 text-[10px] text-ink-muted sm:inline">
              ⌘K
            </kbd>
          </button>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button type="button" className={adminButtonClass({ variant: "secondary", className: "px-3" })}>
                <Plus className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">Agregar</span>
                <ChevronDown className="hidden h-4 w-4 text-ink-muted sm:block" aria-hidden />
                <span className="sr-only sm:hidden">Agregar</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[12rem]">
              <DropdownMenuItem className="min-h-10" onSelect={() => router.push("/sugerir")}>
                Lugar
              </DropdownMenuItem>
              <DropdownMenuItem className="min-h-10" onSelect={() => router.push("/sugerir-emprendimiento")}>
                Emprendimiento
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <div className="min-w-0 px-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:px-8 lg:py-8">{children}</div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <nav aria-label="Navegación móvil del admin" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-cream-card px-1 pt-1 pb-[env(safe-area-inset-bottom)] lg:hidden">
          {ADMIN_MOBILE_PRIMARY.map((href) => ADMIN_NAV.find((item) => item.href === href)!).map((item) => {
            const active = isAdminNavActive(item, pathname)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-0.5 text-[10px]",
                  active ? "bg-olive text-cream" : "text-olive"
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
                <span className="max-w-full truncate">{item.label}</span>
                <span className="absolute right-1 top-1">
                  {navCount(item, active, true)}
                </span>
              </Link>
            )
          })}
          <DialogTrigger asChild><button type="button" className="flex min-h-16 flex-col items-center justify-center gap-1 text-[10px] text-olive"><MoreHorizontal className="h-5 w-5" aria-hidden />Más</button></DialogTrigger>
        </nav>
        <DialogContent className="w-[calc(100%-2rem)] rounded-3xl bg-cream-card [&>button]:min-h-11 [&>button]:min-w-11">
          <DialogTitle>Más herramientas</DialogTitle>
          <DialogDescription>Accesos del administrador de CeliMap</DialogDescription>
          <nav className="grid gap-1" aria-label="Más herramientas">
            {ADMIN_NAV.filter((item) => !ADMIN_MOBILE_PRIMARY.includes(item.href)).map((item) => {
              const Icon = item.icon
              const active = isAdminNavActive(item, pathname)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-11 items-center gap-3 rounded-2xl px-3 text-sm font-medium",
                    active ? "bg-olive text-cream" : "text-olive hover:bg-olive/8"
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" aria-hidden />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </DialogContent>
      </Dialog>

      <AdminCommandSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}
