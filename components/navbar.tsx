"use client"

import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { signInWithGoogle } from "@/lib/native-sign-in"
import { Button } from "@/components/ui/button"
import { LogOut, LogIn, Shield, Heart } from "lucide-react"
import { features } from "@/lib/features"
import { BrandLogo } from "@/components/brand/BrandLogo"

const NAV_LINKS = [
  { href: "/mapa", label: "Mapa" },
  { href: "/listas", label: "Listas" },
  { href: "/emprendimientos", label: "Emprendimientos" },
  { href: "/sugerir", label: "Sugerir lugar" },
] as const

export function Navbar() {
  const { data: session } = useSession()

  return (
    <nav className="sticky top-0 z-50 border-b border-olive/10 bg-cream/90 backdrop-blur-xl supports-[backdrop-filter]:bg-cream/75">
      <div className="container mx-auto px-4">
        <div className="flex h-16 md:h-[4.25rem] items-center justify-between gap-4">
          <Link href="/" className="flex items-center min-w-0" aria-label="CeliMap, ir al inicio">
            <BrandLogo size="sm" />
          </Link>

          <div className="flex items-center gap-1 md:gap-2">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="hidden sm:block">
                <Button variant="ghost" size="sm" className="min-h-[44px] text-olive">
                  {link.label}
                </Button>
              </Link>
            ))}

            {session?.user?.id ? (
              <>
                {features.favorites && (
                  <Link href="/favoritos">
                    <Button variant="ghost" size="icon" aria-label="Favoritos" className="text-olive">
                      <Heart className="h-5 w-5" strokeWidth={1.75} />
                    </Button>
                  </Link>
                )}
                {session.user.role === "admin" && (
                  <Link href="/admin">
                    <Button variant="ghost" size="sm" className="min-h-[44px] text-olive" title="Panel de administración">
                      <Shield className="h-5 w-5 mr-1.5" strokeWidth={1.75} />
                      <span className="hidden sm:inline">Admin</span>
                    </Button>
                  </Link>
                )}
                <div className="flex items-center gap-2">
                  <span className="hidden md:inline text-sm text-muted-foreground">
                    {session.user.name}
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => signOut()} aria-label="Cerrar sesión" className="text-olive">
                    <LogOut className="h-5 w-5" strokeWidth={1.75} />
                  </Button>
                </div>
              </>
            ) : (
              <Button onClick={() => signInWithGoogle()}>
                <LogIn className="h-4 w-4 mr-2" strokeWidth={1.75} />
                Iniciar sesión
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
