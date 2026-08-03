"use client"

import { useEffect } from "react"
import {
  reportClientError,
  setClientErrorSink,
  type ClientErrorReport,
} from "@/lib/client-error-reporter"

let attached = 0
let onError: ((event: ErrorEvent) => void) | null = null
let onRejection: ((event: PromiseRejectionEvent) => void) | null = null

function attachGlobalListeners() {
  if (typeof window === "undefined") return
  if (attached > 0) {
    attached += 1
    return
  }
  onError = (event: ErrorEvent) => {
    reportClientError(event.error ?? event.message, "window.onerror")
  }
  onRejection = (event: PromiseRejectionEvent) => {
    reportClientError(event.reason, "unhandledrejection")
  }
  window.addEventListener("error", onError)
  window.addEventListener("unhandledrejection", onRejection)
  attached = 1
}

function detachGlobalListeners() {
  if (typeof window === "undefined") return
  attached = Math.max(0, attached - 1)
  if (attached > 0) return
  if (onError) window.removeEventListener("error", onError)
  if (onRejection) window.removeEventListener("unhandledrejection", onRejection)
  onError = null
  onRejection = null
}

function isPreviewRuntime(): boolean {
  const env = process.env.NEXT_PUBLIC_VERCEL_ENV || ""
  if (env === "production") return false
  if (env === "preview") return true
  if (typeof window === "undefined") return false
  const host = window.location.host
  return host !== "www.celimap.com.ar" && host !== "celimap.com.ar" && env !== ""
}

/** Sink Preview → POST /api/client-errors (logs Vercel). Sin tokens/PII. */
function previewIngestSink(report: ClientErrorReport): void {
  console.error("[CelimapClientError]", JSON.stringify(report))
  if (typeof window === "undefined") return
  const payload = {
    ...report,
    host: window.location.host,
  }
  void fetch("/api/client-errors", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {
    /* never throw from sink */
  })
}

/** Captura window.onerror y unhandledrejection. Ref-count para Strict Mode. */
export function ClientErrorListeners() {
  useEffect(() => {
    if (isPreviewRuntime()) {
      setClientErrorSink(previewIngestSink)
    }
    attachGlobalListeners()
    return () => {
      detachGlobalListeners()
      setClientErrorSink(null)
    }
  }, [])

  return null
}

export function __resetClientErrorListenersForTests() {
  attached = 0
  setClientErrorSink(null)
  if (typeof window !== "undefined") {
    if (onError) window.removeEventListener("error", onError)
    if (onRejection) window.removeEventListener("unhandledrejection", onRejection)
  }
  onError = null
  onRejection = null
}
