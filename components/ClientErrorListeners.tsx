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

function applyChunkDecision(error: unknown, source: "window.onerror" | "unhandledrejection"): void {
  const decision = decideChunkReload(error)
  if (decision.action === "noop") {
    reportClientError(error, source)
    return
  }
  if (decision.action === "fallback") {
    reportClientError(error, source)
    showFallbackCb?.(true)
    return
  }
  reportClientError(error, source)
  if (typeof window !== "undefined") {
    window.location.reload()
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
    applyChunkDecision(event.error ?? event.message, "window.onerror")
  }
  onRejection = (event: PromiseRejectionEvent) => {
    applyChunkDecision(event.reason, "unhandledrejection")
  }
  window.addEventListener("error", onError)
  window.addEventListener("unhandledrejection", onRejection)
  attached = 1
  bumpDiag("listenerAttachCycles")
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

function previewIngestSink(report: ClientErrorReport): void {
  console.error("[CelimapClientError]", JSON.stringify(report))
  if (typeof window === "undefined") return
  void fetch("/api/client-errors", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...report, host: window.location.host }),
    keepalive: true,
  }).catch(() => {})
}

export function ClientErrorListeners() {
  const [chunkFallback, setChunkFallback] = useState(false)

  useEffect(() => {
    bumpDiag("clientErrorListenerMounts")
    showFallbackCb = setChunkFallback
    if (isPreviewRuntime()) setClientErrorSink(previewIngestSink)
    attachGlobalListeners()
    return () => {
      showFallbackCb = null
      detachGlobalListeners()
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
