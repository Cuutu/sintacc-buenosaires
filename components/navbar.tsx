"use client"

import Link from "next/link"
import Image from "next/image"
import { useSession, signIn, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { User, LogOut, LogIn, Shield, Heart } from "lucide-react"
import { features } from "@/lib/features"

export function Navbar() {
  const { data: session } = useSession()

  return (
    <nav className="border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex h-14 md:h-16 items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image
              src="/celimaplogocompleto.png"
              alt="Celimap"
              width={140}
              height={36}
              className="h-8 w-auto md:h-9"
              priority
            />
          </Link>

          <div className="flex items-center space-x-2 md:space-x-4">
            <Link href="/mapa" className="hidden sm:block">
              <Button variant="ghost" size="sm" className="min-h-[44px]">Mapa</Button>
            </Link>
            <Link href="/sugerir" className="hidden sm:block">
              <Button variant="ghost" size="sm" className="min-h-[44px]">Sugerir lugar</Button>
            </Link>

            {session?.user ? (
              <>
                {features.favorites && (
                  <Link href="/favoritos">
                    <Button variant="ghost" size="icon">
                      <Heart className="h-5 w-5" />
                    </Button>
                  </Link>
                )}
                {session.user.role === "admin" && (
                  <Link href="/admin">
                    <Button variant="ghost" size="icon">
                      <Shield className="h-5 w-5" />
                    </Button>
                  </Link>
                )}
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">
                    {session.user.name}
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => signOut()}>
                    <LogOut className="h-5 w-5" />
                  </Button>
                </div>
              </>
            ) : (
              <Button onClick={() => signIn("google")}>
                <LogIn className="h-4 w-4 mr-2" />
                Iniciar sesión
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
