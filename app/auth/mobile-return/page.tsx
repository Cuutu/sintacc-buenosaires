"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"

function MobileReturnContent() {
  const searchParams = useSearchParams()
  const next = searchParams.get("next") ?? "/perfil"
  const [error, setError] = useState(false)

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
        const params = new URLSearchParams({
          code: data.code,
          next: safeNext,
        })
        window.location.href = `celimap://auth/handoff?${params.toString()}`
      })
      .catch(() => setError(true))
  }, [next])

  if (error) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-muted-foreground">
          No pudimos volver a la app. Cierra esta ventana e intenta iniciar sesión otra vez.
        </p>
      </div>
    )
  }

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 px-6 text-center">
      <p className="text-sm font-medium">Sesión lista</p>
      <p className="text-sm text-muted-foreground">Volviendo a Celimap…</p>
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
