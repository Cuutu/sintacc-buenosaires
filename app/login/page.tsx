"use client"

import { Suspense, useEffect, useMemo } from "react"
import Image from "next/image"
import { signIn, useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoadingState />}>
      <LoginContent />
    </Suspense>
  )
}

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { status } = useSession()

  const callbackUrl = useMemo(() => {
    const rawCallbackUrl = searchParams.get("callbackUrl")

    if (rawCallbackUrl?.startsWith("/") && !rawCallbackUrl.startsWith("//")) {
      return rawCallbackUrl
    }

    return "/perfil"
  }, [searchParams])

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(callbackUrl)
    }
  }, [callbackUrl, router, status])

  if (status === "authenticated") {
    return <LoginLoadingState />
  }

  return (
    <div className="container mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
      <Image
        src="/celimaplogocompleto.png"
        alt="Celimap"
        width={160}
        height={42}
        className="h-10 w-auto mb-8"
      />
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Iniciar sesión</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground mb-6">
            Inicia sesión con tu cuenta de Google para acceder a todas las funciones
          </p>
          <Button
            onClick={() => signIn("google", { callbackUrl })}
            className="w-full"
            disabled={status === "loading"}
            size="lg"
          >
            Continuar con Google
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function LoginLoadingState() {
  return (
    <div className="container mx-auto px-4 py-8 flex min-h-[calc(100vh-8rem)] items-center justify-center">
      <p className="text-sm text-muted-foreground">Redirigiendo...</p>
    </div>
  )
}
