/**
 * Límite de upload de imágenes (servidor).
 * Usa MiB binario (1024³): 5 * 1024 * 1024 bytes.
 * Exactamente MAX_BYTES está permitido (`>` rechaza; `===` OK).
 * Mensaje de error al usuario: "5MB" (copy legible; valor real = 5 MiB).
 */
export const UPLOAD_MAX_BYTES = 5 * 1024 * 1024

export const UPLOAD_MAX_LABEL = "5MB"

export const UPLOAD_ALLOWED_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const

export type UploadAllowedMime = (typeof UPLOAD_ALLOWED_MIMES)[number]

export function isUploadAllowedMime(mime: string): mime is UploadAllowedMime {
  return (UPLOAD_ALLOWED_MIMES as readonly string[]).includes(mime)
}
