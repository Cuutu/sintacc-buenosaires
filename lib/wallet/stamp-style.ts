/**
 * Estilo compartido de los sellos: la franja del Wallet (lib/wallet/stamp-strip.tsx)
 * y la vista previa en la web (components/wallet/StampDots.tsx) se ven igual.
 */

// Pequeña inclinación por casillero para que parezca sellado a mano (siempre igual por posición).
const STAMP_TILTS = [-9, 6, -4, 8, -7, 5, -10, 3, -5, 9, -3, 7, -8, 4, -6, 10, -2, 6, -9, 5]

export function stampTilt(index: number): number {
  return STAMP_TILTS[index % STAMP_TILTS.length]
}

/** Hasta 5 sellos en una fila; si son más, dos filas. */
export function stampGrid(total: number): { rows: number; cols: number } {
  const rows = total <= 5 ? 1 : 2
  return { rows, cols: Math.ceil(total / rows) }
}
