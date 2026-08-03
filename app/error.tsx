"use client"

import { useEffect } from "react"
import { AlertTriangle, Home, RefreshCw } from "lucide-react"
import { reportClientError } from "@/lib/client-error-reporter"

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    reportClientError(error, "error-tsx", { digest: error.digest })
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 bg-[#0a0f0c] px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-amber-300">
        <AlertTriangle className="h-7 w-7" aria-hidden />
      </div>
      <div className="max-w-sm space-y-2">
        <p className="text-base font-semibold text-white">No pudimos cargar esta pantalla</p>
        <p className="text-sm leading-relaxed text-white/60">
          Hubo un error inesperado. Reintentá o volvé al inicio.
        </p>
        {process.env.NODE_ENV === "development" ? (
          <p className="break-words rounded-lg border border-white/10 bg-black/40 p-2 font-mono text-[11px] text-amber-200/90">
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
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white"
        >
          <Home className="h-4 w-4" aria-hidden />
          Ir al inicio
        </a>
      </div>
    </div>
  )
}
