"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { ArrowLeft, Plus, Search, MapPin, Store, Mail, Star, MoreHorizontal } from "lucide-react"
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { ADMIN_NAV } from "./admin-nav"
import { AdminCommandSearch } from "./AdminCommandSearch"
import type { AdminCounts } from "@/lib/admin-ops"
import { adminUi } from "@/lib/admin-ui"
import { BrandLogo } from "@/components/brand/BrandLogo"
import { cn } from "@/lib/utils"

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
    const refresh = () => {
      if (typeof document !== "undefined" && document.hidden) return
      fetch("/api/admin/counts", { cache: "no-store" })
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (active && data) setCounts(data) })
        .catch(() => undefined)
    }
    const timer = setInterval(refresh, 120000)
    const onVisible = () => {
      if (!document.hidden) refresh()
    }
    window.addEventListener("admin:counts-changed", refresh)
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      active = false
      clearInterval(timer)
      window.removeEventListener("admin:counts-changed", refresh)
      document.removeEventListener("visibilitychange", onVisible)
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

  return (
    <div className={cn("admin-ops min-h-screen text-[#234A33] [&_button]:min-h-11 [&_input:not([type=checkbox])]:min-h-11 [&_select]:min-h-11", adminUi.bg)}>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[240px] border-r border-[#E8E1D6] bg-[#F8F5EF] lg:flex lg:flex-col">
        <div className="px-5 pb-4 pt-6">
          <Link href="/" className="flex items-center gap-2" aria-label="Volver a CeliMap">
            <BrandLogo markOnly size="xs" />
            <div>
              <p className="font-display text-sm font-extrabold tracking-[-0.03em] text-[#234A33]">
                CeliMap
              </p>
              <p className="text-[11px] font-medium text-[#6B746C]">Operaciones</p>
            </div>
          </Link>
        </div>
        <nav className="flex-1 space-y-0.5 px-3" aria-label="Admin">
          {ADMIN_NAV.map((item) => {
            const active =
              "match" in item && item.match === "exact"
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`)
            const count = "badge" in item ? badgeFor(item.badge) : 0
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex h-11 items-center justify-between rounded-2xl px-3 text-sm transition-colors duration-150",
                  active
                    ? "bg-[#FCFBF8] font-semibold text-[#234A33] shadow-[0_8px_28px_-18px_rgba(35,74,51,0.16)]"
                    : "text-[#6B746C] hover:bg-[#FCFBF8] hover:text-[#234A33]"
                )}
              >
                <span>
                  {item.label}
                  {count > 0 ? ` (${count})` : ""}
                </span>
                {count > 0 ? (
                  <span className="rounded-full bg-[#C85A2E] px-2 py-0.5 text-[11px] font-bold text-white">
                    {count}
                  </span>
                ) : null}
              </Link>
            )
          })}
        </nav>
        <div className="border-t border-[#E8E1D6] p-3">
          <Link
            href="/"
            className="flex h-11 items-center gap-2 rounded-2xl px-3 text-sm font-medium text-[#234A33] hover:bg-[#FCFBF8]"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a CeliMap
          </Link>
        </div>
      </aside>

      <div className="lg:pl-[240px]">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-[#E8E1D6] bg-[#F8F5EF]/92 px-4 backdrop-blur-md md:px-8">
          <Link
            href="/"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#E8E1D6] text-[#234A33] hover:bg-[#FCFBF8] lg:hidden"
            aria-label="Volver a CeliMap"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-2xl border border-[#E8E1D6] bg-[#FCFBF8] px-3 text-sm text-[#6B746C] lg:max-w-md"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="truncate">Buscar lugares, emprendimientos, mensajes…</span>
            <kbd className="ml-auto hidden rounded-md border border-[#E8E1D6] px-1.5 text-[10px] text-[#6B746C] sm:inline">
              ⌘K
            </kbd>
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/sugerir")}
              className="hidden h-11 items-center gap-2 rounded-2xl bg-[#C85A2E] px-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#A84A26] sm:inline-flex"
            >
              <Plus className="h-4 w-4" />
              Lugar
            </button>
            <button
              type="button"
              onClick={() => router.push("/sugerir-emprendimiento")}
              className="hidden h-11 items-center rounded-2xl border border-[#E8E1D6] px-3 text-sm font-semibold text-[#234A33] transition-colors duration-150 hover:bg-[#FCFBF8] md:inline-flex"
            >
              Emprendimiento
            </button>
          </div>
        </header>
        <div className="min-w-0 px-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:px-8 lg:py-8">{children}</div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <nav aria-label="Navegación móvil del admin" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-[#E8E1D6] bg-[#FCFBF8] px-1 pt-1 pb-[env(safe-area-inset-bottom)] lg:hidden">
          {[
            { href: "/admin/lugares", label: "Lugares", icon: MapPin, count: counts.suggestionsPending },
            { href: "/admin/emprendimientos", label: "Emprendimientos", icon: Store, count: counts.ventureSuggestionsPending },
            { href: "/admin/mensajes", label: "Mensajes", icon: Mail, count: counts.contactsPending },
            { href: "/admin/resenas", label: "Reseñas", icon: Star, count: counts.reviewsPending },
          ].map(({ href, label, icon: Icon, count }) => <Link key={href} href={href}
            aria-current={pathname === href ? "page" : undefined}
            className={cn("relative flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-0.5 text-[10px]", pathname === href ? "bg-[#234A33] text-white" : "text-[#234A33]")}>
            <Icon className="h-5 w-5" aria-hidden />
            <span className="max-w-full truncate">{label}</span>
            {count > 0 && <span className="absolute right-1 top-0 rounded-full bg-[#C85A2E] px-1 text-[10px] text-white" aria-label={`${count} pendientes`}>{count > 99 ? "99+" : count}</span>}
          </Link>)}
          <DialogTrigger asChild><button type="button" className="flex min-h-16 flex-col items-center justify-center gap-1 text-xs"><MoreHorizontal className="h-5 w-5" aria-hidden />Más</button></DialogTrigger>
        </nav>
        <DialogContent className="w-[calc(100%-2rem)] rounded-3xl bg-[#FCFBF8] [&>button]:min-h-11 [&>button]:min-w-11">
          <DialogTitle>Más herramientas</DialogTitle>
          <DialogDescription>Accesos del administrador de CeliMap</DialogDescription>
          <nav className="grid gap-2" aria-label="Más herramientas">
            {ADMIN_NAV.filter(item => !["/admin/lugares", "/admin/emprendimientos", "/admin/mensajes", "/admin/resenas"].includes(item.href)).map(item =>
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={adminUi.btnGhost}>{item.label}</Link>)}
          </nav>
        </DialogContent>
      </Dialog>

      <AdminCommandSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}
