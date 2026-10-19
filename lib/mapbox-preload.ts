/**
 * El mapa (MapboxMap + Mapbox GL, ~450 KB gzip) va en su propio chunk. Esto lo baja
 * antes de que haga falta: al cargar /mapa (en paralelo con la hidratación) o cuando
 * el dedo pasa por "Mapa" en la barra de abajo.
 */
export const loadMapboxMapModule = () => import("@/components/map-view/MapboxMap")

let preload: Promise<unknown> | null = null

export function preloadMapboxMap(): void {
  // Si falla (sin conexión), se reintenta la próxima vez.
  preload ??= loadMapboxMapModule().catch(() => {
    preload = null
  })
}
