/**
 * Estado TACC del local en la tarjeta de sellos: 100% sin TACC o con opciones.
 * Sale del mismo dato que el mapa (tags primero, después safetyLevel), así la tarjeta
 * nunca dice algo distinto de la ficha. Sin señal clara, la tarjeta no lleva etiqueta.
 */

import { resolvePrimarySafety, type PlaceWithStats } from "@/components/featured/featured-utils"

export type CardSafety = "dedicated" | "options"

export function cardSafetyFor(place: {
  safetyLevel?: PlaceWithStats["safetyLevel"]
  tags?: string[]
}): CardSafety | null {
  const level = resolvePrimarySafety(place)
  if (level === "dedicated_gf") return "dedicated"
  if (level === "gf_options") return "options"
  return null
}

/** Mismas palabras que el resto del sitio. */
export const CARD_SAFETY_LABEL: Record<CardSafety, string> = {
  dedicated: "100% sin TACC",
  options: "Con opciones sin TACC",
}

/** Texto del dorso de la tarjeta: CeliMap informa, no garantiza. */
export function cardSafetyNote(safety: CardSafety): string {
  return safety === "dedicated"
    ? "Según CeliMap, este lugar es 100% sin TACC. Igual, confirmá siempre con el local."
    : "Según CeliMap, este lugar tiene opciones sin TACC. Preguntá en el local cómo las preparan."
}

export type CardTheme = {
  /** Fondo de la tarjeta (Apple, Google y la vista previa web). */
  background: string
  /** Fin del degradé de la franja de sellos. */
  backgroundEnd: string
  /** Etiquetas chicas: LOCAL, PREMIO, SELLOS. */
  label: string
  emptyFill: string
  rewardFill: string
  /** Anillo y regalo del casillero del premio. */
  accent: string
  /** Borde del sello del premio ya ganado. */
  rewardBorder: string
}

const OLIVE: CardTheme = {
  background: "#2D4A34",
  backgroundEnd: "#243D2B",
  label: "#D6CDBA",
  // Rellenos opacos para que la textura de espigas no cruce los números.
  emptyFill: "#31503A",
  rewardFill: "#404731",
  accent: "#D4633A",
  rewardBorder: "#D4633A",
}

// Terracota de los pines "con opciones" del mapa, más oscura para que el crema se lea bien.
const TERRACOTTA: CardTheme = {
  background: "#A84A26",
  backgroundEnd: "#8F3D1F",
  label: "#F3D9C9",
  emptyFill: "#A34826",
  rewardFill: "#8A3B1D",
  accent: "#F7F3EB",
  rewardBorder: "#2D4A34",
}

/** Como en el mapa: verde oliva para 100% sin TACC (y sin dato), terracota para con opciones. */
export function cardTheme(safety: CardSafety | null): CardTheme {
  return safety === "options" ? TERRACOTTA : OLIVE
}

/** Etiqueta sobre los sellos: fondo, texto y qué pin lleva adelante. */
export function cardSafetyPill(safety: CardSafety): { background: string; text: string; pin: "mark" | "reward" } {
  if (safety === "dedicated") return { background: "#F7F3EB", text: "#2D4A34", pin: "mark" }
  return { background: "#F7F3EB", text: TERRACOTTA.background, pin: "reward" }
}
