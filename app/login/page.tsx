"use client"

import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import {
  isAppleSignInAvailable,
  NativeAppleSignInError,
  signInWithApple,
  signInWithGoogle,
} from "@/lib/native-sign-in"
import { useRouter, useSearchParams } from "next/navigation"
import { AppleSignInButton } from "@/components/auth/AppleSignInButton"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BrandLogo } from "@/components/brand/BrandLogo"

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
  const appleLock = useRef(false)
  const googleLock = useRef(false)

  const callbackUrl = useMemo(() => {
    const rawCallbackUrl = searchParams.get("callbackUrl")

    if (rawCallbackUrl?.startsWith("/") && !rawCallbackUrl.startsWith("//")) {
      return rawCallbackUrl
    }

    return "/perfil"
  }, [searchParams])

  useEffect(() => {
    let cancelled = false
    const reveal = () => {
      if (cancelled) return false
      if (isAppleSignInAvailable()) {
        setShowApple(true)
        return true
      }
      return false
    }
    if (reveal()) return
    const interval = window.setInterval(() => {
      if (reveal()) window.clearInterval(interval)
    }, 50)
    const timeout = window.setTimeout(() => window.clearInterval(interval), 2500)
    return () => {
      cancelled = true
      window.clearInterval(interval)
      window.clearTimeout(timeout)
    }
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
    if (googleLock.current || busy) return
    googleLock.current = true
    setError(null)
    setSigningGoogle(true)
    try {
      await signInWithGoogle(callbackUrl)
    } catch {
      setError("No pudimos iniciar sesión con Google. Probá de nuevo.")
    } finally {
      googleLock.current = false
      setSigningGoogle(false)
    }
  }

  async function handleAppleSignIn() {
    if (appleLock.current || busy) return
    appleLock.current = true
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
      appleLock.current = false
      setSigningApple(false)
    }
  }

  return (
    <div
      data-testid="login-screen"
      className="mx-auto flex w-full max-w-full flex-col items-center justify-center overflow-x-hidden px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] min-h-[calc(100dvh-8rem)] [@media(max-height:700px)]:min-h-0 [@media(max-height:700px)]:justify-start"
    >
      <div className="mb-6 [@media(max-height:700px)]:mb-3">
        <BrandLogo size="md" showTagline />
      </div>
      <Card data-testid="login-card" className="mx-auto w-full max-w-[400px]">
        <CardHeader>
          <CardTitle className="text-center">Iniciar sesión</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-6 text-center text-muted-foreground">
            {showApple
              ? "Iniciá sesión con Apple o Google para acceder a favoritos, listas y reseñas"
              : "Iniciá sesión con tu cuenta de Google para acceder a todas las funciones"}
          </p>
          {error ? (
            <p className="mb-4 text-center text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <div data-testid="login-oauth-row" className="flex flex-col gap-3">
            {showApple ? (
              <AppleSignInButton
                onClick={() => void handleAppleSignIn()}
                disabled={busy}
                loading={signingApple}
              />
            ) : null}
            <Button
              type="button"
              onClick={() => void handleGoogleSignIn()}
              className="login-oauth-btn h-12 min-h-[48px] w-full rounded-lg"
              disabled={busy}
              size="lg"
              variant={showApple ? "outline" : "default"}
              aria-label="Continuar con Google"
              data-testid="google-signin-button"
              data-provider="google"
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
    <div className="flex min-h-[calc(100dvh-8rem)] items-center justify-center px-4 py-8">
      <p className="text-sm text-muted-foreground">Redirigiendo...</p>
    </div>
  )
}
