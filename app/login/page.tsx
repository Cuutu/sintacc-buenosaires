"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { signInWithGoogle } from "@/lib/native-sign-in"
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
  const [signingIn, setSigningIn] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  async function handleGoogleSignIn() {
    setError(null)
    setSigningIn(true)
    try {
      await signInWithGoogle(callbackUrl)
    } catch {
      setError("No pudimos iniciar sesión con Google. Probá de nuevo.")
    } finally {
      // Google sheet / browser may be dismissed without navigating away.
      setSigningIn(false)
    }
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
          {error ? (
            <p className="mb-4 text-center text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button
            onClick={() => void handleGoogleSignIn()}
            className="w-full"
            disabled={status === "loading" || signingIn}
            size="lg"
          >
            {signingIn ? "Conectando…" : "Continuar con Google"}
          </Button>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Al continuar aceptás nuestra{" "}
            <Link href="/privacidad" className="underline hover:text-foreground">
              política de privacidad
            </Link>
            .
          </p>
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
