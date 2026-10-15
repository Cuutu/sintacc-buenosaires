/** Tamaños e impresión del cartel con QR (/local/cartel/<programa>). */

/** El cartel se diseña en milímetros de un A5; el A4 es el mismo diseño agrandado. */
export const POSTER_SIZES = {
  a5: { label: "A5 · mostrador", page: "A5", unit: "1mm" },
  a4: { label: "A4 · vidriera", page: "A4", unit: "1.41421mm" },
} as const

export type PosterSize = keyof typeof POSTER_SIZES

export function parsePosterSize(value: unknown): PosterSize {
  return value === "a4" ? "a4" : "a5"
}

/**
 * Al imprimir queda sólo el cartel, del tamaño exacto de la hoja. En pantalla se achica
 * para entrar en el celu. Va en un <style> de la página (no en un .css global) para que
 * deje de aplicarse al navegar a otra.
 */
export function posterCss(size: PosterSize): string {
  const { page, unit } = POSTER_SIZES[size]
  return `
@page { size: ${page} portrait; margin: 0; }
[data-cartel] {
  --u-print: ${unit};
  --u: min(var(--u-print), calc((100vw - 2rem) / 148));
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
@media print {
  html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
  body:has([data-cartel]) *:not(:has([data-cartel])):not([data-cartel]):not([data-cartel] *) { display: none !important; }
  body:has([data-cartel]) *:has([data-cartel]) {
    display: block !important; position: static !important; margin: 0 !important; padding: 0 !important;
    width: auto !important; max-width: none !important; height: auto !important; min-height: 0 !important;
    overflow: visible !important; background: none !important; box-shadow: none !important; transform: none !important;
  }
  [data-cartel] { --u: var(--u-print); height: calc(var(--u) * 210 - 0.5mm) !important; box-shadow: none !important; }
}`
}
