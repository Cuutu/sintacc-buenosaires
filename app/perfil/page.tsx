"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { User, LogOut } from "lucide-react"

export default function PerfilPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

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
    </div>
  )
}
