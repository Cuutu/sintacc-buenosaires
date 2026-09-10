"use client"

import { useEffect, useRef } from "react"
import {
  startPlaceDwell,
  pausePlaceDwell,
  resumePlaceDwell,
  cancelPlaceDwell,
  checkPlaceDwell,
} from "@/lib/analytics-dwell"
import { recordQualifiedDwell } from "@/lib/analytics-discovery"

interface TrackPlaceDwellProps {
  placeId: string
  properties: Record<string, string | number | boolean>
}

/**
 * Tracks qualified dwell for a place page.
 * - Accumulates visible time (pauses when tab is hidden)
 * - Emits place_dwell_qualified when threshold (8s) is reached
 * - Cancels tracking on unmount (navigation away)
 * - Deduplicates: at most one emission per (session, placeId)
 */
export function TrackPlaceDwell({ placeId, properties }: TrackPlaceDwellProps) {
  const placeIdRef = useRef(placeId)
  const propertiesRef = useRef(properties)
  placeIdRef.current = placeId
  propertiesRef.current = properties

  useEffect(() => {
    const currentPlaceId = placeIdRef.current

    startPlaceDwell(currentPlaceId, propertiesRef.current)

    const checkInterval = setInterval(() => {
      checkPlaceDwell(currentPlaceId)
    }, 1000)

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        pausePlaceDwell(currentPlaceId)
      } else if (document.visibilityState === "visible") {
        resumePlaceDwell(currentPlaceId)
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange)

    return () => {
      clearInterval(checkInterval)
      document.removeEventListener("visibilitychange", onVisibilityChange)
      pausePlaceDwell(currentPlaceId)
      cancelPlaceDwell(currentPlaceId)
    }
  }, [placeId])

  return null
}
