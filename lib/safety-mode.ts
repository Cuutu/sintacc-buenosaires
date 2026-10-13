import { inferSafetyLevel } from "@/components/featured/featured-utils"

/**
 * Modo "Sólo 100% sin TACC": preferencia del usuario guardada en el dispositivo.
 *
 * Se elige en la bienvenida, en el interruptor del hero o con el selector de
 * seguridad del mapa (mobile y escritorio), y al abrir el mapa arranca filtrado
 * por `100_gf`. Es una preferencia de filtro, no un dato del lugar: nunca cambia
 * cómo se clasifica un lugar.
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

/** Selector de seguridad del mapa: excluyente, sobre los tags `100_gf` / `opciones_sin_tacc`. */
export type SafetyMode = "todos" | "cien" | "opc"

const SAFETY_TAGS = ["100_gf", "opciones_sin_tacc"]

/** Si vienen los dos tags (URL vieja) cuenta como "todos". */
export function safetyModeFromTags(tags: readonly string[]): SafetyMode {
  const cien = tags.includes("100_gf")
  const opc = tags.includes("opciones_sin_tacc")
  if (cien && !opc) return "cien"
  if (opc && !cien) return "opc"
  return "todos"
}

/** Reemplaza el filtro de seguridad y conserva el resto de los tags (cocina_separada, delivery…). */
export function withSafetyMode(tags: readonly string[], mode: SafetyMode): string[] {
  const rest = tags.filter((t) => !SAFETY_TAGS.includes(t))
  if (mode === "cien") return [...rest, "100_gf"]
  if (mode === "opc") return [...rest, "opciones_sin_tacc"]
  return rest
}

/** El selector del mapa está en "100%" (y no en "Con opciones"). */
export function isOnly100Tags(tags: readonly string[]): boolean {
  return safetyModeFromTags(tags) === "cien"
}

/** Tags iniciales del mapa con el modo aplicado. Si ya hay un filtro de seguridad, se respeta. */
export function applyOnly100ToTags(tags: readonly string[], only100: boolean): string[] {
  if (!only100) return [...tags]
  if (tags.some((t) => SAFETY_TAGS.includes(t))) return [...tags]
  return [...tags, "100_gf"]
}

/**
 * El servidor filtra con `tags: { $in: [...] }`, así que un lugar con `100_gf` y
 * `opciones_sin_tacc` a la vez entra en "100%", aunque se muestre como "Con opciones"
 * (en `inferSafetyLevel` gana opciones). Acá se descartan esos casos para que el
 * selector y los pines digan lo mismo. Sólo saca lugares: nunca reclasifica uno.
 */
export function refinePlacesBySafetyMode<T extends Parameters<typeof inferSafetyLevel>[0]>(
  places: T[],
  mode: SafetyMode
): T[] {
  if (mode === "todos") return places
  const wanted = mode === "cien" ? "dedicated_gf" : "gf_options"
  const refined = places.filter((p) => inferSafetyLevel(p) === wanted)
  return refined.length === places.length ? places : refined
}
