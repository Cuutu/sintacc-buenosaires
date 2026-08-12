"use client"

import { useEffect, useRef } from "react"
import { trackEvent, type AnalyticsEvent } from "@/lib/analytics"

/** Dispara un evento de página una vez al montar (ciudades, guías, etc.). */
export function TrackPageView({
  event,
  properties,
}: {
  event: AnalyticsEvent
  properties?: Record<string, string | number | boolean>
}) {
  const propsRef = useRef(properties)
  propsRef.current = properties
  const sent = useRef(false)

  useEffect(() => {
    if (sent.current) return
    sent.current = true
    trackEvent(event, propsRef.current)
  }, [event])

  return null
}
