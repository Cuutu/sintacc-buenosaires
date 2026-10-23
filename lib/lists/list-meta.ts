/** Título del detalle de una lista: el template del sitio le agrega " | CeliMap". */
export function listPageTitle(name: string): string {
  return `${name.trim()} · Lista sin TACC`
}

function absolute(url: string, baseUrl: string): string | null {
  const value = url.trim()
  if (!value) return null
  if (/^https?:\/\//i.test(value)) return value
  if (value.startsWith("//")) return `https:${value}`
  if (value.startsWith("/")) return `${baseUrl}${value}`
  return null
}

/**
 * Imagen para compartir la lista: la portada o, si no tiene, la foto del primer lugar
 * que tenga. Null si no hay ninguna (va la imagen general del sitio).
 */
export function listShareImage(
  coverImage: string | null | undefined,
  places: Array<{ photos?: string[] | null } | null | undefined>,
  baseUrl: string
): string | null {
  if (coverImage) {
    const cover = absolute(coverImage, baseUrl)
    if (cover) return cover
  }
  for (const place of places) {
    const photo = place?.photos?.find((p) => typeof p === "string" && p.trim())
    if (photo) {
      const url = absolute(photo, baseUrl)
      if (url) return url
    }
  }
  return null
}
