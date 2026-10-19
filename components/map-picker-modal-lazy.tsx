"use client"

import dynamic from "next/dynamic"
import { useEffect, useState, type ComponentProps } from "react"

type MapPickerModalProps = ComponentProps<(typeof import("@/components/map-picker-modal"))["MapPickerModal"]>

const loadMapPicker = () => import("@/components/map-picker-modal")

/** Empieza a bajar el selector (y Mapbox) antes del click: al pasar el mouse o apoyar el dedo. */
export function preloadMapPicker() {
  void loadMapPicker().catch(() => undefined)
}

const MapPickerModalInner = dynamic(() => loadMapPicker().then((m) => m.MapPickerModal), { ssr: false })

/**
 * Mismo MapPickerModal, pero Mapbox (~430 KB) se baja recién la primera vez que
 * se abre. En /sugerir venía en el JS inicial aunque casi nadie abre el mapa.
 */
export function LazyMapPickerModal(props: MapPickerModalProps) {
  const [mounted, setMounted] = useState(props.open)
  useEffect(() => {
    if (props.open) setMounted(true)
  }, [props.open])
  if (!mounted) return null
  return <MapPickerModalInner {...props} />
}
