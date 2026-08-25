"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { sanitizeReturnTo } from "@/lib/auth-return-to"
import { reportNativeOAuth } from "@/lib/native-oauth-report"

function MobileReturnContent() {
  const searchParams = useSearchParams()
  const next = searchParams.get("next") ?? "/perfil"
  const [error, setError] = useState(false)
  const [message, setMessage] = useState("Preparando sesión…")

  useEffect(() => {
    const safeNext = sanitizeReturnTo(next)
    const startedAt = Date.now()

    fetch("/api/auth/mobile-handoff", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ next: safeNext }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("handoff failed")
        const data = (await res.json()) as { code?: string }
        if (!data.code) throw new Error("missing code")

        setMessage("Volviendo a CeliMap…")
        reportNativeOAuth("native-oauth-return", {
          route: "/auth/mobile-return",
          deepLink: true,
          durationMs: Date.now() - startedAt,
        })

        // Path fijo del binario TestFlight actual (NativeAppBridge).
        const params = new URLSearchParams({
          code: data.code,
          next: safeNext,
        })
        const deepLink = `celimap://auth/handoff?${params.toString()}`
        window.location.href = deepLink

        window.setTimeout(() => {
          setMessage(
            "Si no volviste a la app, cerrá esta ventana y abrí CeliMap desde TestFlight."
          )
        }, 2000)
      })
      .catch(() => {
        setError(true)
        reportNativeOAuth("native-oauth-error", {
          route: "/auth/mobile-return",
          code: "handoff_failed",
        })
      })
  }, [next])

  if (error) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-muted-foreground">
          No pudimos volver a la app. Cerrá esta ventana e intentá iniciar sesión otra vez desde
          CeliMap.
        </p>
      </div>
    )
  }

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 px-6 text-center">
      <p className="text-sm font-medium">Sesión lista</p>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

export default function MobileReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
          Preparando sesión…
        </div>
      }
    >
      <MobileReturnContent />
    </Suspense>
  )
}
