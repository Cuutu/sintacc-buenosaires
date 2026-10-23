/**
 * Copia propia de las fotos de Cloudinary (respaldo por si la cuenta gratis se corta).
 *
 * - scripts/cloudinary-backup.ts baja los originales a una carpeta del servidor
 *   (por defecto /srv/celimap/shared/img-mirror), con el mismo public_id.
 * - Caddy sirve esa carpeta en https://img.celimap.com.ar (ver
 *   docs/RESPALDO-IMAGENES.md).
 * - scripts/cloudinary-mirror-urls.ts cambia las URLs guardadas en Mongo en un
 *   sentido o en el otro con estas dos funciones.
 *
 * La URL espejo conserva la versión de Cloudinary (`v123/`) para que el cambio
 * sea exactamente reversible; Caddy la saca al buscar el archivo.
 *
 *   https://res.cloudinary.com/<cloud>/image/upload/v123/places/abc.jpg
 *   https://img.celimap.com.ar/v123/places/abc.jpg   → archivo places/abc.jpg
 *
 * Sólo se convierten originales (sin transformaciones en la URL): son los que
 * guarda /api/upload. Lo demás se deja como está.
 */

/** Si cambia, cambiarlo también en next.config.js (remotePatterns y CSP) y en lib/avatar-url.ts. */
export const IMAGE_MIRROR_HOST = "img.celimap.com.ar"
export const IMAGE_MIRROR_ORIGIN = `https://${IMAGE_MIRROR_HOST}`

const CLOUDINARY_ORIGIN = "https://res.cloudinary.com"

/** public_id + extensión: letras, números, _ - / y un solo punto antes de la extensión. */
const SAFE_FILE_PATH = /^[A-Za-z0-9_\-]+(?:\/[A-Za-z0-9_\-]+)*\.[A-Za-z0-9]{2,5}$/

export type MirrorParts = {
  /** "v123/" o "" */
  version: string
  /** places/abc.jpg */
  filePath: string
}

/** true si `filePath` es seguro para usar dentro de la carpeta espejo (sin "..", sin rutas absolutas). */
export function isSafeMirrorFilePath(filePath: string): boolean {
  return SAFE_FILE_PATH.test(filePath)
}

/** Archivo de la copia para un recurso de Cloudinary (public_id sin extensión + formato). */
export function mirrorFilePathFor(publicId: string, format: string): string | null {
  const filePath = `${publicId}.${format}`
  return isSafeMirrorFilePath(filePath) ? filePath : null
}

function splitAfterPrefix(url: string, prefix: string): MirrorParts | null {
  if (!url.startsWith(prefix)) return null
  const rest = url.slice(prefix.length)
  if (rest.includes("?") || rest.includes("#")) return null
  const m = /^(v\d+\/)?(.+)$/.exec(rest)
  if (!m) return null
  const version = m[1] ?? ""
  const filePath = m[2]
  if (!isSafeMirrorFilePath(filePath)) return null
  return { version, filePath }
}

/** Partes de una URL original de nuestra cuenta de Cloudinary; null si no es convertible. */
export function parseCloudinaryOriginal(url: string, cloudName: string): MirrorParts | null {
  if (!url || !cloudName) return null
  return splitAfterPrefix(url.trim(), `${CLOUDINARY_ORIGIN}/${cloudName}/image/upload/`)
}

/** Cloudinary → copia propia. null si la URL no es un original de nuestra cuenta. */
export function toMirrorUrl(url: string, cloudName: string): string | null {
  const parts = parseCloudinaryOriginal(url, cloudName)
  if (!parts) return null
  return `${IMAGE_MIRROR_ORIGIN}/${parts.version}${parts.filePath}`
}

/** Partes de una URL de la copia propia; null si no lo es. */
export function parseMirrorUrl(url: string): MirrorParts | null {
  if (!url) return null
  return splitAfterPrefix(url.trim(), `${IMAGE_MIRROR_ORIGIN}/`)
}

/** Copia propia → Cloudinary (vuelta atrás). null si la URL no es de la copia. */
export function toCloudinaryUrl(url: string, cloudName: string): string | null {
  const parts = parseMirrorUrl(url)
  if (!parts || !cloudName) return null
  return `${CLOUDINARY_ORIGIN}/${cloudName}/image/upload/${parts.version}${parts.filePath}`
}
