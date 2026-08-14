"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, Home, RefreshCw } from "lucide-react"
import { reportClientError } from "@/lib/client-error-reporter"

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [eventId, setEventId] = useState<string | null>(null)

  useEffect(() => {
    const id = reportClientError({
      source: "next-route-error",
      error,
      digest: error.digest,
    })
    if (id) setEventId(id)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 bg-card px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-olive/10 bg-olive/5 text-amber-300">
        <AlertTriangle className="h-7 w-7" aria-hidden />
      </div>
      <div className="max-w-sm space-y-2">
        <p className="text-base font-semibold text-olive">No pudimos cargar esta pantalla</p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Hubo un error inesperado. Reintentá o volvé al inicio.
        </p>
        {eventId ? (
          <p className="text-xs text-muted-foreground" data-testid="error-event-id">
            Código del error: <span className="font-mono tracking-wide text-olive/80">{eventId}</span>
          </p>
        ) : null}
        {process.env.NODE_ENV === "development" ? (
          <p className="break-words rounded-lg border border-olive/10 bg-black/40 p-2 font-mono text-[11px] text-amber-200/90">
            {error.message}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          Reintentar
        </button>
        <a
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-olive/15 bg-olive/5 px-4 py-2.5 text-sm font-semibold text-olive"
        >
          <Home className="h-4 w-4" aria-hidden />
          Ir al inicio
        </a>
      </div>
    </div>
  )
}
