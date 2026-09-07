"use client"

import * as React from "react"
import type { UserLatLng } from "./geo"

export type LocationStatus = "unknown" | "prompt" | "granted" | "denied" | "unavailable" | "error"

export function useUserLocation() {
  const [coords, setCoords] = React.useState<UserLatLng | null>(null)
  const [status, setStatus] = React.useState<LocationStatus>("unknown")
  const [message, setMessage] = React.useState<string | null>(null)

  const applyPosition = React.useCallback((position: GeolocationPosition) => {
    setCoords({
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    })
    setStatus("granted")
    setMessage(null)
  }, [])

  const setFromCoords = React.useCallback((next: UserLatLng) => {
    setCoords(next)
    setStatus("granted")
    setMessage(null)
  }, [])

  const request = React.useCallback(
    (options?: { silent?: boolean }) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        setStatus("unavailable")
        if (!options?.silent) {
          setMessage("Tu navegador no soporta ubicación.")
        }
        return
      }
      navigator.geolocation.getCurrentPosition(
        applyPosition,
        (error) => {
          setCoords(null)
          const denied = error.code === error.PERMISSION_DENIED
          setStatus(denied ? "denied" : "error")
          if (!options?.silent) {
            setMessage(
              denied
                ? "Sin ubicación. Mostramos recomendados."
                : "No pudimos obtener tu ubicación. Mostramos recomendados."
            )
          }
        },
        { maximumAge: 120000, timeout: 8000, enableHighAccuracy: false }
      )
    },
    [applyPosition]
  )

  React.useEffect(() => {
    if (typeof navigator === "undefined") return
    if (!navigator.geolocation) {
      setStatus("unavailable")
      return
    }
    if (!navigator.permissions?.query) {
      setStatus("prompt")
      return
    }
    let cancelled = false
    let permission: PermissionStatus | null = null
    const onChange = () => {
      if (cancelled || !permission) return
      if (permission.state === "granted") {
        setStatus("granted")
        request({ silent: true })
        return
      }
      if (permission.state === "denied") {
        setStatus("denied")
        setCoords(null)
        return
      }
      setStatus("prompt")
    }
    navigator.permissions
      .query({ name: "geolocation" })
      .then((result) => {
        if (cancelled) return
        permission = result
        onChange()
        result.addEventListener("change", onChange)
      })
      .catch(() => {
        if (!cancelled) setStatus("prompt")
      })
    return () => {
      cancelled = true
      permission?.removeEventListener("change", onChange)
    }
  }, [request])

  const clearMessage = React.useCallback(() => setMessage(null), [])

  return { coords, status, message, request, setFromCoords, clearMessage }
}
