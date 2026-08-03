"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { isNativeApp } from "@/lib/native-app"

function MobileReturnContent() {
  const searchParams = useSearchParams()
  const next = searchParams.get("next") ?? "/perfil"
  const [error, setError] = useState(false)
  const [message, setMessage] = useState("Preparando sesión…")

  useEffect(() => {
    const safeNext =
      next.startsWith("/") && !next.startsWith("//") ? next : "/perfil"

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

        setMessage("Volviendo a Celimap…")
        const params = new URLSearchParams({
          code: data.code,
          next: safeNext,
        })
        const deepLink = `celimap://auth/handoff?${params.toString()}`

        // Intenta deep link nativo; si no, muestra hint
        window.location.href = deepLink

        // Fallback: si seguimos en browser a los 2s
        window.setTimeout(() => {
          setMessage(
            "Si no volviste a la app, cerrá esta ventana y abrí Celimap desde TestFlight."
          )
        }, 2000)
      })
      .catch(() => setError(true))
  }, [next])

  if (error) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-muted-foreground">
          No pudimos volver a la app. Cerrá esta ventana e intentá iniciar sesión otra vez desde Celimap.
        </p>
      </div>
    )
  }

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 px-6 text-center">
      <p className="text-sm font-medium">Sesión lista</p>
      <p className="text-sm text-muted-foreground">{message}</p>
      {!isNativeApp() && (
        <p className="mt-2 text-xs text-muted-foreground">
          Estás en el navegador. Abrí Celimap (TestFlight) para continuar logueado.
        </p>
      )}
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
