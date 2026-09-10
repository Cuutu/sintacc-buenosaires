"use client"

import { useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { trackEvent, type AnalyticsEvent } from "@/lib/analytics"
import { setAnalyticsAuthenticated } from "@/lib/analytics-client"

/**
 * Dispara un evento de página una vez al montar (ciudades, guías, etc.).
 * Espera a que el estado de autenticación esté listo para evitar place_view con
 * authenticated:false seguido de favorite_add con authenticated:true.
 */
export function TrackPageView({
  event,
  properties,
}: {
  event: AnalyticsEvent
  properties?: Record<string, string | number | boolean>
}) {
  const { status } = useSession()
  const propsRef = useRef(properties)
  propsRef.current = properties
  const sent = useRef(false)

  useEffect(() => {
    if (sent.current) return
    if (status === "loading") return

    sent.current = true
    setAnalyticsAuthenticated(status === "authenticated")
    trackEvent(event, propsRef.current)
  }, [event, status])

  return null
}
