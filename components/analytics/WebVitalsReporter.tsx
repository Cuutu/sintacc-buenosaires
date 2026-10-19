"use client"

import { useEffect } from "react"
import { runAfterLoadWhenIdle } from "@/lib/idle"
import { primeWebVitalEntryRoute, reportWebVital } from "@/lib/web-vitals-client"

let registered = false

/**
 * Manda LCP, INP, CLS, FCP y TTFB como eventos first-party (`web_vital`).
 *
 * La librería (~6 KB gzip) se baja después del `load`, cuando el navegador está libre:
 * no compite con la página que mide. No se pierde nada, porque web-vitals lee las
 * mediciones que el navegador ya guardó (observers con `buffered`). La ruta de entrada
 * se fija al montar, por si el usuario navega antes de que cargue.
 */
export function WebVitalsReporter() {
  useEffect(() => {
    primeWebVitalEntryRoute()
    if (registered) return
    return runAfterLoadWhenIdle(() => {
      if (registered) return
      registered = true
      import("next/dist/compiled/web-vitals")
        .then(({ onCLS, onFCP, onINP, onLCP, onTTFB }) => {
          onCLS(reportWebVital)
          onFCP(reportWebVital)
          onINP(reportWebVital)
          onLCP(reportWebVital)
          onTTFB(reportWebVital)
        })
        .catch(() => {
          // Sin conexión o chunk viejo: esta visita queda sin medir.
          registered = false
        })
    })
  }, [])
  return null
}
