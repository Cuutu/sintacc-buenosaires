/**
 * Modo "Sólo 100% sin TACC": preferencia del usuario guardada en el dispositivo.
 *
 * Se elige en la bienvenida, en el interruptor del hero o con el selector del mapa
 * mobile, y al abrir el mapa arranca filtrado por `100_gf`. Es una preferencia de
 * filtro, no un dato del lugar: nunca cambia cómo se clasifica un lugar.
 *
 * Sólo se lee en el cliente después de montar (las páginas son ISR / se renderizan
 * en el servidor sin saber del usuario).
 */

export const ONLY_100_STORAGE_KEY = "celimap_solo_100"
/** Se emite en `window` cuando cambia la preferencia (para sincronizar varios controles). */
export const SAFETY_MODE_EVENT = "celimap:safety-mode"

export function readOnly100(): boolean {
  try {
    return localStorage.getItem(ONLY_100_STORAGE_KEY) === "1"
  } catch {
    return false
  }
}

export function writeOnly100(on: boolean): void {
  try {
    if (on) localStorage.setItem(ONLY_100_STORAGE_KEY, "1")
    else localStorage.removeItem(ONLY_100_STORAGE_KEY)
  } catch {
    // localStorage bloqueado (modo privado): el modo vale sólo para esta vista
  }
  try {
    window.dispatchEvent(new CustomEvent(SAFETY_MODE_EVENT, { detail: { only100: on } }))
  } catch {
    // ignore
  }
}

const SAFETY_TAGS = ["100_gf", "opciones_sin_tacc"]

/** El selector del mapa mobile está en "100%" (y no en "Con opciones"). */
export function isOnly100Tags(tags: readonly string[]): boolean {
  return tags.includes("100_gf") && !tags.includes("opciones_sin_tacc")
}

/** Tags iniciales del mapa con el modo aplicado. Si ya hay un filtro de seguridad, se respeta. */
export function applyOnly100ToTags(tags: readonly string[], only100: boolean): string[] {
  if (!only100) return [...tags]
  if (tags.some((t) => SAFETY_TAGS.includes(t))) return [...tags]
  return [...tags, "100_gf"]
}
