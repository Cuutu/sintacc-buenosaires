type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
  cancelIdleCallback?: (id: number) => void
}

/**
 * Corre `fn` cuando la página terminó de cargar (`load`) y el navegador está libre.
 * Para trabajo que no hace falta para ver la página: medir web vitals, registrar el
 * service worker. Safari no tiene requestIdleCallback: ahí espera `fallbackMs`
 * después del `load`. Devuelve una función para cancelar.
 */
export function runAfterLoadWhenIdle(
  fn: () => void,
  { timeoutMs = 4000, fallbackMs = 300 }: { timeoutMs?: number; fallbackMs?: number } = {}
): () => void {
  if (typeof window === "undefined") return () => {}
  const w = window as IdleWindow
  let cancelled = false
  let idleId: number | undefined
  let timeoutId: number | undefined

  const run = () => {
    if (!cancelled) fn()
  }

  const schedule = () => {
    if (cancelled) return
    if (typeof w.requestIdleCallback === "function") {
      idleId = w.requestIdleCallback(run, { timeout: timeoutMs })
    } else {
      timeoutId = window.setTimeout(run, fallbackMs)
    }
  }

  if (document.readyState === "complete") schedule()
  else window.addEventListener("load", schedule, { once: true })

  return () => {
    cancelled = true
    window.removeEventListener("load", schedule)
    if (idleId !== undefined) w.cancelIdleCallback?.(idleId)
    if (timeoutId !== undefined) window.clearTimeout(timeoutId)
  }
}
