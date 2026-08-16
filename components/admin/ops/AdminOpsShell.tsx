"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { ArrowLeft, Menu, Plus, Search, X } from "lucide-react"
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
    const t = setInterval(() => {
      fetch("/api/admin/counts")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) setCounts(data)
        })
        .catch(() => undefined)
    }, 30000)
    return () => clearInterval(t)
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
    <div className={cn("admin-ops min-h-screen text-[#234A33]", adminUi.bg)}>
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
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#E8E1D6] text-[#234A33] lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>
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
            <span className="truncate">Buscar lugares, marcas, mensajes…</span>
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
              Marca
            </button>
          </div>
        </header>
        <div className="px-4 py-8 md:px-8">{children}</div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-[#234A33]/30"
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[min(84vw,280px)] border-r border-[#E8E1D6] bg-[#F8F5EF] p-4">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-[#234A33]">Operaciones</p>
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#E8E1D6]"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="space-y-1">
              {ADMIN_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex h-11 items-center rounded-2xl px-3 text-sm text-[#6B746C] hover:bg-[#FCFBF8] hover:text-[#234A33]"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="mt-4 flex h-11 items-center gap-2 rounded-2xl border border-[#E8E1D6] px-3 text-sm font-medium text-[#234A33]"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a CeliMap
            </Link>
          </div>
        </div>
      ) : null}

      <AdminCommandSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}
