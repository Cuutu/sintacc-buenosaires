"use client"

import { forwardRef, lazy, Suspense, type ComponentPropsWithoutRef } from "react"
import type { MapboxMap as MapboxMapComponent, MapboxMapRef } from "./MapboxMap"
import { loadMapboxMapModule } from "@/lib/mapbox-preload"

const LazyMapboxMap = lazy(() => loadMapboxMapModule().then((mod) => ({ default: mod.MapboxMap })))

type MapboxMapProps = ComponentPropsWithoutRef<typeof MapboxMapComponent>

/**
 * MapboxMap en su propio chunk. Mientras baja se ve el fondo del mapa; la lista, los
 * filtros y el pedido de lugares no lo esperan. El ref (flyTo, etc.) pasa directo.
 */
export const MapboxMapLazy = forwardRef<MapboxMapRef, MapboxMapProps>(function MapboxMapLazy(
  props,
  ref
) {
  return (
    <Suspense
      fallback={<div className="h-full w-full bg-[#ECE6D8]" aria-busy="true" data-map-loading="" />}
    >
      <LazyMapboxMap ref={ref} {...props} />
    </Suspense>
  )
})
