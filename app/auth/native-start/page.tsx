"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { signIn } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { sanitizeReturnTo } from "@/lib/auth-return-to"
import { reportNativeOAuth } from "@/lib/native-oauth-report"

const GUARD_KEY = "celimap_native_oauth_start_v1"
const GUARD_MS = 8_000

function NativeStartContent() {
  const searchParams = useSearchParams()
  const startedRef = useRef(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    const from = searchParams.get("from")
    if (from !== "native") {
      setError("Esta pantalla solo inicia sesión desde la app CeliMap.")
      reportNativeOAuth("native-oauth-error", {
        route: "/auth/native-start",
        code: "not_native_entry",
      })
      return
    }

    try {
      const prev = sessionStorage.getItem(GUARD_KEY)
      if (prev && Date.now() - Number(prev) < GUARD_MS) {
        setError("El inicio de sesión ya estaba en curso. Volvé a intentar desde la app.")
        reportNativeOAuth("native-oauth-error", {
          route: "/auth/native-start",
          code: "start_loop",
        })
        return
      }
      sessionStorage.setItem(GUARD_KEY, String(Date.now()))
    } catch {
      /* ignore */
    }

    const returnTo = sanitizeReturnTo(searchParams.get("returnTo"))
    const callbackUrl = `/auth/mobile-return?next=${encodeURIComponent(returnTo)}`

    reportNativeOAuth("native-oauth-start", { route: "/auth/native-start" })

    void signIn("google", { callbackUrl }).catch(() => {
      setError("No pudimos abrir Google. Cerrá esta ventana e intentá de nuevo desde CeliMap.")
      reportNativeOAuth("native-oauth-error", {
        route: "/auth/native-start",
        code: "signin_throw",
      })
    })
  }, [searchParams])

  if (error) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-muted-foreground">{error}</p>
        <p className="text-xs text-muted-foreground">
          Podés cerrar esta ventana y volver a tocar “Continuar con Google” en la app.
        </p>
      </div>
    )
  }

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 px-6 text-center">
      <p className="text-sm font-medium">Abriendo Google…</p>
      <p className="text-sm text-muted-foreground">Un momento, te llevamos a elegir tu cuenta.</p>
    </div>
  )
}

export default function NativeStartPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
          Abriendo Google…
        </div>
      }
    >
      <NativeStartContent />
    </Suspense>
  )
}
