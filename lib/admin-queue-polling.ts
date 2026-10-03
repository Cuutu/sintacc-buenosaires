/**
 * setInterval que sólo corre con la pestaña visible: se frena al ocultarse y, al volver,
 * hace un tick y reanuda. Devuelve la limpieza para usarla como retorno de useEffect.
 * Cada tick invoca funciones en Vercel (ver lib/mongodb.ts), así que no pollear de fondo.
 */
export function pollWhileVisible(tick: () => void, intervalMs: number): () => void {
  let timer: ReturnType<typeof setInterval> | null = null
  const isVisible = () => document.visibilityState === "visible"
  const start = () => {
    if (timer === null) timer = setInterval(tick, intervalMs)
  }
  const stop = () => {
    if (timer !== null) clearInterval(timer)
    timer = null
  }
  const onVisibilityChange = () => {
    if (isVisible()) {
      tick()
      start()
    } else {
      stop()
    }
  }
  if (isVisible()) start()
  document.addEventListener("visibilitychange", onVisibilityChange)
  return () => {
    stop()
    document.removeEventListener("visibilitychange", onVisibilityChange)
  }
}

/** Hay trabajo en la cola si quedan jobs encolados o corriendo (los trabados cuentan como running). */
export function queueHasPendingWork(
  stats: { queued?: number; running?: number } | null | undefined
): boolean {
  return (stats?.queued ?? 0) > 0 || (stats?.running ?? 0) > 0
}
