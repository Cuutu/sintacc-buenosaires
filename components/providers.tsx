"use client"

import { SessionProvider } from "next-auth/react"
import { FavoritesProvider } from "@/components/favorites-provider"

export function Providers({ children }: { children: React.ReactNode }) {
  // Sin refetch de la sesión cada vez que la pestaña (o la app) vuelve al frente: era un
  // pedido a /api/auth/session y un render de todo lo que usa la sesión, también arriba
  // del mapa. Los logins terminan siempre en una recarga, así que no hace falta.
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <FavoritesProvider>{children}</FavoritesProvider>
    </SessionProvider>
  )
}
