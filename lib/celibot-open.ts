/**
 * Abre el panel de CeliBot desde cualquier lugar (buscador del inicio, barra del mapa).
 * ChatWidget escucha este evento. `prompt` se precarga en el campo de texto; no se envía solo.
 *
 * ChatWidget se carga diferido (dynamic, ssr: false): si alguien toca la entrada antes de
 * que esté montado, el pedido queda pendiente y el widget lo toma al montar.
 */
export const OPEN_CELIBOT_EVENT = "celimap:open-celibot"

export type OpenCeliBotDetail = { prompt?: string }

let widgetReady = false
let pending: OpenCeliBotDetail | null = null

export function openCeliBot(prompt?: string): void {
  const detail: OpenCeliBotDetail = { prompt: prompt?.trim() || undefined }
  if (!widgetReady) {
    pending = detail
    return
  }
  try {
    window.dispatchEvent(new CustomEvent<OpenCeliBotDetail>(OPEN_CELIBOT_EVENT, { detail }))
  } catch {
    // ignore
  }
}

/** Lo llama ChatWidget al montar/desmontar. Devuelve el pedido pendiente, si hubo uno. */
export function setCeliBotWidgetReady(ready: boolean): OpenCeliBotDetail | null {
  widgetReady = ready
  if (!ready) return null
  const next = pending
  pending = null
  return next
}
