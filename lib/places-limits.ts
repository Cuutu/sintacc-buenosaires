/**
 * Límites de GET /api/places que también usa el cliente (mapa, embeds de las
 * landings). Viven acá y no en lib/validations para que importarlos no meta zod
 * (~13 KB gzip) en el JS del navegador.
 *
 * Techo de `limit`: el mapa pide por bbox y pagina hasta vaciar el viewport; no
 * hay dump del catálogo en una request.
 */
export const PUBLIC_PLACES_MAX_LIMIT = 100
