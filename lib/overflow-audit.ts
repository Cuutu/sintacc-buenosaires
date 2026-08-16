/**
 * Detección de overflow horizontal (contratos / tests).
 * No whitelist global amplia: cada overflow legítimo se marca explícito.
 */

export const LEGITIMATE_OVERFLOW_MARKERS = [
  "data-overflow-allowed=\"stats-carousel\"",
  "data-overflow-allowed=\"map-chips\"",
  "data-overflow-allowed=\"hero-chips\"",
  "data-overflow-allowed=\"mapbox-canvas\"",
  "data-overflow-allowed=\"featured-carousel\"",
  "data-overflow-allowed=\"decoration\"",
  "data-overflow-allowed=\"nearby-rail\"",
  "data-overflow-allowed=\"venture-featured\"",
  "data-overflow-allowed=\"venture-chips\"",
  "data-overflow-allowed=\"admin-ops-quick\"",
] as const

export type OverflowBox = {
  left: number
  right: number
  /** Marcador explícito en el elemento o ancestro */
  allowedMarker?: string | null
}

export type OverflowHit = {
  index: number
  left: number
  right: number
  overflowLeft: number
  overflowRight: number
}

/**
 * Devuelve elementos cuyo box horizontal sale del viewport [0, viewportWidth],
 * excluyendo los que declaran un marcador legítimo conocido.
 */
export function findHorizontalOverflow(
  boxes: OverflowBox[],
  viewportWidth: number,
  epsilon = 1
): OverflowHit[] {
  const hits: OverflowHit[] = []
  for (let i = 0; i < boxes.length; i++) {
    const box = boxes[i]
    if (
      box.allowedMarker &&
      LEGITIMATE_OVERFLOW_MARKERS.some((m) => m.includes(box.allowedMarker!))
    ) {
      continue
    }
    const overflowLeft = Math.max(0, -box.left)
    const overflowRight = Math.max(0, box.right - viewportWidth)
    if (overflowLeft > epsilon || overflowRight > epsilon) {
      hits.push({
        index: i,
        left: box.left,
        right: box.right,
        overflowLeft,
        overflowRight,
      })
    }
  }
  return hits
}

/** Ancho de tarjeta stats para peek intencional (no full-bleed accidental). */
export function statsCarouselCardWidthCss(): string {
  // ~82vw con tope 260px → primera completa + peek de la siguiente
  return "min(260px, 82vw)"
}
