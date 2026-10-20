/**
 * JSON-LD para <script type="application/ld+json">. JSON.stringify no alcanza
 * cuando hay texto de la base (nombres de lugares, listas, emprendimientos): un
 * "</script>" en un nombre cerraría el script. Se escapan <, >, & y los
 * separadores de línea U+2028/U+2029; el JSON sigue siendo el mismo.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029")
}
