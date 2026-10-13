/**
 * Estilo del mapa principal. Los estilos se editan y publican en Mapbox Studio
 * (nada de paint en runtime). `NEXT_PUBLIC_MAPBOX_STYLE_URL` permite que un
 * entorno (por ejemplo prueba) use otro estilo publicado sin tocar el de
 * producción. Como toda variable `NEXT_PUBLIC_*`, se fija en el build.
 */

const STYLE_URL_RE = /^mapbox:\/\/styles\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+$/

/** Devuelve `raw` si es una URL de estilo válida (`mapbox://styles/<usuario>/<id>`); si no, `fallback`. */
export function resolveMapStyleUrl(raw: string | undefined, fallback: string): string {
  const value = raw?.trim()
  return value && STYLE_URL_RE.test(value) ? value : fallback
}

/** Id del estilo (`mapbox://styles/cuutu/<id>` → `<id>`), o null si no es una URL de estilo. */
export function mapStyleIdFromUrl(styleUrl: string): string | null {
  if (!STYLE_URL_RE.test(styleUrl)) return null
  return styleUrl.slice(styleUrl.lastIndexOf("/") + 1)
}

export function configuredMapStyleUrl(fallback: string): string {
  return resolveMapStyleUrl(process.env.NEXT_PUBLIC_MAPBOX_STYLE_URL, fallback)
}
