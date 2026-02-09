"use client"

import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function LoginPage() {
  return (
    <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[calc(100vh-8rem)]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Iniciar sesión</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground mb-6">
            Inicia sesión con tu cuenta de Google para acceder a todas las funciones
          </p>
          <Button
            onClick={() => signIn("google")}
            className="w-full"
            size="lg"
          >
            Continuar con Google
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
