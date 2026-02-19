"use client"

import { useEffect, useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { User, LogOut, Heart, MapPin, ChevronRight } from "lucide-react"
import { fetchApi } from "@/lib/fetchApi"
import { IPlace } from "@/models/Place"
import { TYPES } from "@/lib/constants"

export default function PerfilPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [savedPlaces, setSavedPlaces] = useState<IPlace[]>([])
  const [loadingSaved, setLoadingSaved] = useState(true)

  useEffect(() => {
    if (session) {
      fetchSavedPlaces()
    } else {
      setLoadingSaved(false)
    }
  }, [session])

  const fetchSavedPlaces = async () => {
    try {
      const data = await fetchApi<{ favorites: Array<{ placeId: IPlace }> }>("/api/favorites")
      setSavedPlaces(data.favorites?.map((f) => f.placeId) || [])
    } catch {
      setSavedPlaces([])
    } finally {
      setLoadingSaved(false)
    }
  }

  if (status === "loading") {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-12 w-48 bg-muted rounded" />
          <div className="h-32 bg-muted rounded-lg" />
        </div>
      </div>
    )
  }

  if (!session) {
    router.replace("/login")
    return null
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Mi perfil</h1>

      <Card className="border-white/10 bg-white/5 backdrop-blur-md">
        <CardHeader>
          <div className="flex items-center gap-4">
            {session.user?.image ? (
              <img
                src={session.user.image}
                alt={session.user.name || ""}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="h-8 w-8 text-primary" />
              </div>
            )}
            <div>
              <CardTitle className="text-lg">{session.user?.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{session.user?.email}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="outline"
            className="w-full h-12 min-h-[44px] justify-start gap-3"
            onClick={() => router.push("/sugerir")}
          >
            Sugerir un lugar
          </Button>
          <Button
            variant="outline"
            className="w-full h-12 min-h-[44px] justify-start gap-3 text-muted-foreground"
            onClick={() => signOut()}
          >
            <LogOut className="h-5 w-5" />
            Cerrar sesión
          </Button>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-white/5 backdrop-blur-md mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" />
              Lugares guardados
            </CardTitle>
            {savedPlaces.length > 0 && (
              <Link href="/favoritos">
                <Button variant="ghost" size="sm">
                  Ver todos
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loadingSaved ? (
            <div className="py-6 text-center text-muted-foreground text-sm">Cargando...</div>
          ) : savedPlaces.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              Todavía no guardaste ningún lugar. Cuando le des Guardar a un lugar en su página de detalle, aparecerá acá.
            </p>
          ) : (
            <div className="space-y-3">
              {savedPlaces.slice(0, 5).map((place) => (
                <Link key={place._id.toString()} href={`/lugar/${place._id}`}>
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-white/5 transition-colors">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-xl shrink-0">
                      {TYPES.find((t) => t.value === place.type)?.emoji || "📍"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{place.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {place.neighborhood}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                </Link>
              ))}
              {savedPlaces.length > 5 && (
                <Link href="/favoritos">
                  <Button variant="ghost" className="w-full">
                    Ver los {savedPlaces.length - 5} restantes
                  </Button>
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
