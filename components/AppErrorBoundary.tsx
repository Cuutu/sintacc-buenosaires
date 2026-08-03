"use client"

import React from "react"
import { AlertTriangle, Home, RefreshCw } from "lucide-react"
import { reportClientError } from "@/lib/client-error-reporter"

interface Props {
  children: React.ReactNode
  /** Si true, en development re-lanza para ver overlay Next */
  rethrowInDev?: boolean
}

interface State {
  hasError: boolean
  message: string
}

/**
 * Boundary de sección/ruta. No reemplaza encontrar la causa raíz.
 * En development puede rethrow para no ocultar el error.
 */
export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: "" }
  private retryCount = 0

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error?.message || "Error inesperado",
    }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    reportClientError(error, "boundary")
    if (process.env.NODE_ENV === "development") {
      console.error("[AppErrorBoundary] componentStack", info.componentStack)
    }
    if (this.props.rethrowInDev !== false && process.env.NODE_ENV === "development") {
      // No rethrow aquí: rompería el boundary. Overlay Next ya loguea en consolas.
    }
  }

  handleRetry = () => {
    this.retryCount += 1
    if (this.retryCount > 3) {
      this.goHome()
      return
    }
    this.setState({ hasError: false, message: "" })
  }

  goHome = () => {
    this.setState({ hasError: false, message: "" })
    this.retryCount = 0
    if (typeof window !== "undefined") {
      window.location.assign("/")
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 bg-[#0a0f0c] px-6 py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-amber-300">
            <AlertTriangle className="h-7 w-7" aria-hidden />
          </div>
          <div className="max-w-sm space-y-2">
            <p className="text-base font-semibold text-white">Algo falló en esta pantalla</p>
            <p className="text-sm leading-relaxed text-white/60">
              Podés reintentar o volver al inicio. El resto de la app sigue disponible.
            </p>
            {process.env.NODE_ENV === "development" && this.state.message ? (
              <p className="break-words rounded-lg border border-white/10 bg-black/40 p-2 font-mono text-[11px] text-amber-200/90">
                {this.state.message}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              Reintentar
            </button>
            <button
              type="button"
              onClick={this.goHome}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white"
            >
              <Home className="h-4 w-4" aria-hidden />
              Ir al inicio
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
