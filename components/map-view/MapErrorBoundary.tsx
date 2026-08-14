"use client"

import React from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"

interface MapErrorBoundaryProps {
  children: React.ReactNode
  onRetry?: () => void
}

interface State {
  hasError: boolean
  message: string
}

/**
 * Aísla fallos de Mapbox/WebGL para que buscador/lista sigan usables.
 */
export class MapErrorBoundary extends React.Component<MapErrorBoundaryProps, State> {
  state: State = { hasError: false, message: "" }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error?.message || "Error al inicializar el mapa",
    }
  }

  componentDidCatch(error: Error) {
    console.error("[MapErrorBoundary]", error)
  }

  handleRetry = () => {
    this.setState({ hasError: false, message: "" })
    this.props.onRetry?.()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-card px-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-olive/10 bg-olive/5 text-amber-300">
            <AlertTriangle className="h-7 w-7" aria-hidden />
          </div>
          <div className="max-w-sm space-y-2">
            <p className="text-base font-semibold text-olive">No pudimos cargar el mapa</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              No pudimos cargar el mapa en este dispositivo. Todavía podés explorar los lugares desde
              la lista.
            </p>
          </div>
          <button
            type="button"
            onClick={this.handleRetry}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Reintentar
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
