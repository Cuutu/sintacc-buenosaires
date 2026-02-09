"use client"

import Link from "next/link"
import { useSession, signIn, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { MapPin, User, LogOut, LogIn, Shield, Heart } from "lucide-react"
import { features } from "@/lib/features"

export function Navbar() {
  const { data: session } = useSession()

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <MapPin className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">SinTACC BSAS</span>
          </Link>

          <div className="flex items-center space-x-4">
            <Link href="/mapa">
              <Button variant="ghost">Mapa</Button>
            </Link>
            <Link href="/sugerir">
              <Button variant="ghost">Sugerir lugar</Button>
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
