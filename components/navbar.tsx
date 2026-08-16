"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { signInWithGoogle } from "@/lib/native-sign-in"
import { Button } from "@/components/ui/button"
import { LogOut, LogIn, Shield, Heart } from "lucide-react"
import { features } from "@/lib/features"
import { BrandLogo } from "@/components/brand/BrandLogo"
import { cn } from "@/lib/utils"
const NAV_LINKS = [
  { href: "/mapa", label: "Mapa" },
  { href: "/listas", label: "Listas" },
  { href: "/emprendimientos", label: "Emprendimientos" },
  { href: "/sugerir", label: "Sugerir lugar" },
] as const

export function Navbar() {
  const { data: session } = useSession()
  const [compact, setCompact] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      setCompact(window.scrollY > 24)
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <>
      <header
        className={cn(
          "fixed left-1/2 z-50 -translate-x-1/2 transition-[top,width] duration-300 ease-out",
          compact ? "top-2 w-[min(86%,52rem)]" : "top-4 w-[min(88%,64rem)]"
        )}
      >
        <nav
          aria-label="Principal"
          data-testid="site-navbar"
          data-compact={compact ? "true" : "false"}
          className={cn(
            "celimap-nav-pill grid grid-cols-[1fr_auto_1fr] items-center rounded-full border border-olive/10 shadow-[0_10px_40px_-18px_rgba(45,74,52,0.35)] backdrop-blur-xl transition-[height,padding,background-color,box-shadow] duration-300 ease-out",
            compact
              ? "h-12 bg-cream/85 px-3 supports-[backdrop-filter]:bg-cream/72"
              : "h-16 bg-cream/80 px-4 supports-[backdrop-filter]:bg-cream/62"
          )}
        >
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2 justify-self-start pl-1"
            aria-label="CeliMap, ir al inicio"
          >
            <BrandLogo markOnly size="xs" />
            <span
              className={cn(
                "font-display font-extrabold tracking-[-0.03em] text-olive",
                compact ? "text-base" : "text-lg"
              )}
            >
              CeliMap
            </span>
          </Link>

          <div className="hidden items-center gap-0.5 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-full px-3 text-sm font-semibold text-olive transition-colors hover:bg-olive/8",
                  compact ? "py-1.5" : "py-2"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex shrink-0 items-center justify-self-end gap-1">
            {session?.user?.id ? (
              <>
                {features.favorites && (
                  <Link href="/favoritos">
                    <Button variant="ghost" size="icon" aria-label="Favoritos" className="h-10 w-10 min-h-[40px] min-w-[40px] rounded-full text-olive">
                      <Heart className="h-5 w-5" strokeWidth={1.75} />
                    </Button>
                  </Link>
                )}
                {session.user.role === "admin" && (
                  <Link href="/admin">
                    <Button variant="ghost" size="sm" className="min-h-[40px] rounded-full text-olive" title="Panel de administración">
                      <Shield className="h-5 w-5 mr-1.5" strokeWidth={1.75} />
                      <span className="hidden lg:inline">Admin</span>
                    </Button>
                  </Link>
                )}
                <span className={cn("hidden text-sm text-muted-foreground xl:inline", compact && "xl:hidden")}>
                  {session.user.name}
                </span>
                <Button variant="ghost" size="icon" onClick={() => signOut()} aria-label="Cerrar sesión" className="h-10 w-10 min-h-[40px] min-w-[40px] rounded-full text-olive">
                  <LogOut className="h-5 w-5" strokeWidth={1.75} />
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => signInWithGoogle()}
                  className={cn(
                    "rounded-full bg-[#C85A2E] px-4 text-white shadow-none hover:bg-[#A84A26]",
                    compact ? "h-9 min-h-[36px] px-3.5 text-sm" : "h-10 min-h-[40px] px-5"
                  )}
                >
                  <LogIn className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
                  Iniciar sesión
                </Button>
              </>
            )}
          </div>
        </nav>
      </header>
      <div className="h-[var(--desktop-nav-clearance)] shrink-0" aria-hidden />
    </>
  )
}
