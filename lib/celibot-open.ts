/**
 * Abre el panel de CeliBot desde cualquier lugar (buscador del inicio, barra del mapa).
 * ChatWidget escucha este evento. `prompt` se precarga en el campo de texto; no se envía solo.
 */
export const OPEN_CELIBOT_EVENT = "celimap:open-celibot"

export type OpenCeliBotDetail = { prompt?: string }

export function openCeliBot(prompt?: string): void {
  try {
    window.dispatchEvent(
      new CustomEvent<OpenCeliBotDetail>(OPEN_CELIBOT_EVENT, {
        detail: { prompt: prompt?.trim() || undefined },
      })
    )
  } catch {
    // ignore
  }
}
