/**
 * Las reseñas, respuestas y reportes se guardan pasados por `sanitizeHtml()`
 * (lib/validations.ts), que cambia `"` por `&quot;`, `'` por `&#x27;`, etc.
 * React ya escapa el texto al mostrarlo, así que en pantalla esas entidades
 * se veían tal cual ("&quot;rico&quot;"). Esto las vuelve a convertir para mostrar
 * (o para editar una respuesta). Es seguro: el resultado se renderiza como texto,
 * nunca con dangerouslySetInnerHTML.
 */

const ENTITIES: Record<string, string> = {
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#x27;": "'",
  "&#39;": "'",
  "&#x2f;": "/",
  "&#47;": "/",
  "&amp;": "&",
}

const ENTITY_RE = /&(?:lt|gt|quot|amp|#x27|#39|#x2F|#47);/gi

export function decodeStoredText(value: string | null | undefined): string {
  if (!value) return ""
  return value.replace(ENTITY_RE, (match) => ENTITIES[match.toLowerCase()] ?? match)
}
