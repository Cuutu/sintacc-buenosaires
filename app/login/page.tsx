"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useSession } from "next-auth/react"
import {
  isAppleSignInAvailable,
  NativeAppleSignInError,
  signInWithApple,
  signInWithGoogle,
} from "@/lib/native-sign-in"
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
  const [signingGoogle, setSigningGoogle] = useState(false)
  const [signingApple, setSigningApple] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showApple, setShowApple] = useState(false)

  const callbackUrl = useMemo(() => {
    const rawCallbackUrl = searchParams.get("callbackUrl")

    if (rawCallbackUrl?.startsWith("/") && !rawCallbackUrl.startsWith("//")) {
      return rawCallbackUrl
    }

    return "/perfil"
  }, [searchParams])

  useEffect(() => {
    setShowApple(isAppleSignInAvailable())
  }, [])

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(callbackUrl)
    }
  }, [callbackUrl, router, status])

  if (status === "authenticated") {
    return <LoginLoadingState />
  }

  const busy = signingGoogle || signingApple || status === "loading"

  async function handleGoogleSignIn() {
    setError(null)
    setSigningGoogle(true)
    try {
      await signInWithGoogle(callbackUrl)
    } catch {
      setError("No pudimos iniciar sesión con Google. Probá de nuevo.")
    } finally {
      setSigningGoogle(false)
    }
  }

  async function handleAppleSignIn() {
    setError(null)
    setSigningApple(true)
    try {
      await signInWithApple(callbackUrl)
    } catch (err) {
      if (err instanceof NativeAppleSignInError && err.code === "cancelled") {
        return
      }
      if (err instanceof NativeAppleSignInError && err.code === "other_provider") {
        setError(err.message)
        return
      }
      setError("No pudimos iniciar sesión con Apple. Probá de nuevo.")
    } finally {
      setSigningApple(false)
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
            {showApple
              ? "Iniciá sesión con Apple o Google para acceder a favoritos, listas y reseñas"
              : "Iniciá sesión con tu cuenta de Google para acceder a todas las funciones"}
          </p>
          {error ? (
            <p className="mb-4 text-center text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex flex-col gap-3">
            {showApple ? (
              <Button
                type="button"
                onClick={() => void handleAppleSignIn()}
                className="w-full bg-black text-white hover:bg-black/90"
                disabled={busy}
                size="lg"
                aria-label="Continuar con Apple"
              >
                {signingApple ? "Conectando…" : "Continuar con Apple"}
              </Button>
            ) : null}
            <Button
              type="button"
              onClick={() => void handleGoogleSignIn()}
              className="w-full"
              disabled={busy}
              size="lg"
              variant={showApple ? "outline" : "default"}
              aria-label="Continuar con Google"
            >
              {signingGoogle ? "Conectando…" : "Continuar con Google"}
            </Button>
          </div>
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
