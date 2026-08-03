"use client"

import { useEffect, useState } from "react"
import {
  reportClientError,
  setClientErrorSink,
  type ClientErrorReport,
} from "@/lib/client-error-reporter"
import {
  decideChunkReload,
  markChunkReloadSettled,
} from "@/lib/chunk-reload"
import { ChunkLoadFallbackBanner } from "@/components/pwa/PwaRegister"
import { bumpDiag } from "@/lib/celimap-diag"

let attached = 0
let onError: ((event: ErrorEvent) => void) | null = null
let onRejection: ((event: PromiseRejectionEvent) => void) | null = null
let showFallbackCb: ((v: boolean) => void) | null = null

function applyChunkDecision(
  error: unknown,
  source: "window-error" | "unhandled-rejection"
): void {
  try {
    const decision = decideChunkReload(error)
    if (decision.action === "noop") {
      reportClientError({ source, error })
      return
    }
    if (decision.action === "fallback") {
      reportClientError({ source, error })
      showFallbackCb?.(true)
      return
    }
    reportClientError({ source, error })
    if (typeof window !== "undefined") {
      // WebKit a veces ignora reload() síncrono dentro del handler de `error`.
      window.setTimeout(() => {
        window.location.reload()
      }, 0)
    }
  } catch {
    /* never break page from reporter/chunk path */
  }
}

function attachGlobalListeners() {
  if (typeof window === "undefined") return
  if (attached > 0) {
    attached += 1
    return
  }
  markChunkReloadSettled()
  onError = (event: ErrorEvent) => {
    applyChunkDecision(event.error ?? event.message, "window-error")
  }
  onRejection = (event: PromiseRejectionEvent) => {
    applyChunkDecision(event.reason, "unhandled-rejection")
  }
  window.addEventListener("error", onError)
  window.addEventListener("unhandledrejection", onRejection)
  attached = 1
  bumpDiag("listenerAttachCycles")
}

/** Adjuntar al cargar el módulo (antes del useEffect) — captura ChunkLoad temprano. */
if (typeof window !== "undefined") {
  attachGlobalListeners()
}

/** Sink opcional extra (tests). El POST productivo lo hace el reporter. */
function quietDevSink(report: ClientErrorReport): void {
  if (process.env.NODE_ENV === "development") {
    console.error(
      "[CelimapClientError]",
      JSON.stringify({ eventId: report.eventId, source: report.source })
    )
  }
}

export function ClientErrorListeners() {
  const [chunkFallback, setChunkFallback] = useState(false)

  useEffect(() => {
    bumpDiag("clientErrorListenerMounts")
    showFallbackCb = setChunkFallback
    setClientErrorSink(quietDevSink)
    // Refcount: listeners ya viven a nivel módulo; no detach en unmount.
    attachGlobalListeners()
    return () => {
      showFallbackCb = null
      setClientErrorSink(null)
    }
  }, [])

  return <ChunkLoadFallbackBanner show={chunkFallback} />
}

export function __resetClientErrorListenersForTests() {
  attached = 0
  setClientErrorSink(null)
  showFallbackCb = null
  if (typeof window !== "undefined") {
    if (onError) window.removeEventListener("error", onError)
    if (onRejection) window.removeEventListener("unhandledrejection", onRejection)
  }
  onError = null
  onRejection = null
}

export function __getClientErrorListenerAttachCountForTests() {
  return attached
}
