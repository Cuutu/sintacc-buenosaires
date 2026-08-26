"use client"

import React from "react"
import { AlertTriangle, Home, RefreshCw } from "lucide-react"
import { reportClientError, type ClientErrorSource } from "@/lib/client-error-reporter"

interface Props {
  children: React.ReactNode
  /**
   * Cuando cambia (p.ej. pathname), limpia hasError vía componentDidUpdate.
   * No combinar con key={pathname}.
   */
  resetKey?: string
  /** page = fallback pantalla; chrome = fallback chico (BottomNav) */
  variant?: "page" | "chrome"
  /** Source explícito; default según variant */
  source?: ClientErrorSource
  rethrowInDev?: boolean
}

interface State {
  hasError: boolean
  message: string
  eventId: string | null
}

/**
 * Boundary de sección. Hipótesis: no es la causa raíz — protege chrome/page.
 */
export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: "", eventId: null }
  private retryCount = 0

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      message: error?.message || "Error inesperado",
    }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    const source: ClientErrorSource =
      this.props.source ||
      (this.props.variant === "chrome" ? "bottom-nav-boundary" : "page-boundary")
    const eventId = reportClientError({
      source,
      error,
      componentStack: info.componentStack,
    })
    if (eventId) this.setState({ eventId })
    if (process.env.NODE_ENV === "development") {
      console.error("[AppErrorBoundary] componentStack", info.componentStack)
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (
      prevProps.resetKey !== this.props.resetKey &&
      this.props.resetKey !== undefined &&
      this.state.hasError
    ) {
      this.retryCount = 0
      this.setState({ hasError: false, message: "", eventId: null })
    }
  }

  handleRetry = () => {
    this.retryCount += 1
    if (this.props.variant !== "chrome" && this.retryCount > 3) {
      this.goHome()
      return
    }
    this.setState({ hasError: false, message: "", eventId: null })
  }

  goHome = () => {
    this.setState({ hasError: false, message: "", eventId: null })
    this.retryCount = 0
    if (typeof window !== "undefined") {
      window.location.assign("/")
    }
  }

  copyCode = async () => {
    const id = this.state.eventId
    if (!id || typeof navigator === "undefined" || !navigator.clipboard) return
    try {
      await navigator.clipboard.writeText(id)
    } catch {
      /* ignore */
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children

    if (this.props.variant === "chrome") {
      return (
        <div
          className="fixed bottom-[var(--bottom-nav-clearance)] left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-olive/15 bg-cream/90 px-3 py-2 text-xs text-olive shadow-lg"
          data-error-boundary="chrome"
          data-testid="bottom-nav-error-boundary"
          role="alert"
        >
          <span>Nav con problema</span>
          {this.state.eventId ? (
            <span data-testid="error-event-id" className="font-mono text-[10px] text-muted-foreground">
              {this.state.eventId}
            </span>
          ) : null}
          <button
            type="button"
            onClick={this.handleRetry}
            className="rounded-full bg-primary px-2.5 py-1 font-semibold text-primary-foreground"
          >
            Reintentar
          </button>
        </div>
      )
    }

    return (
      <div
        className="flex min-h-[50vh] flex-col items-center justify-center gap-4 bg-card px-6 py-12 text-center"
        data-error-boundary="section"
        data-testid="app-error-boundary"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-olive/10 bg-olive/5 text-amber-300">
          <AlertTriangle className="h-7 w-7" aria-hidden />
        </div>
        <div className="max-w-sm space-y-2">
          <p className="text-base font-semibold text-olive">Algo falló en esta pantalla</p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Podés reintentar o volver al inicio. El resto de la app sigue disponible.
          </p>
          {this.state.eventId ? (
            <p className="text-xs text-muted-foreground" data-testid="error-event-id">
              Código del error:{" "}
              <span className="font-mono tracking-wide text-olive/80">{this.state.eventId}</span>
            </p>
          ) : null}
          {process.env.NODE_ENV === "development" && this.state.message ? (
            <p className="break-words rounded-lg border border-olive/10 bg-black/40 p-2 font-mono text-[11px] text-amber-200/90">
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
            className="inline-flex items-center gap-2 rounded-full border border-olive/15 bg-olive/5 px-4 py-2.5 text-sm font-semibold text-olive"
          >
            <Home className="h-4 w-4" aria-hidden />
            Ir al inicio
          </button>
          {this.state.eventId ? (
            <button
              type="button"
              onClick={this.copyCode}
              className="inline-flex items-center gap-2 rounded-full border border-olive/10 px-3 py-2 text-xs font-medium text-muted-foreground"
              data-testid="copy-error-code"
            >
              Copiar código
            </button>
          ) : null}
        </div>
      </div>
    )
  }
}
