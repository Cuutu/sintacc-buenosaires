/**
 * Valida URL de avatar antes de next/image.
 * Solo https + hosts permitidos (remotePatterns).
 */

const ALLOWED_AVATAR_HOSTS = [
  "lh3.googleusercontent.com",
  "res.cloudinary.com",
  // Copia propia de Cloudinary (lib/image-mirror.ts).
  "img.celimap.com.ar",
] as const

export function isAllowedAvatarUrl(src: string | null | undefined): boolean {
  if (!src || typeof src !== "string") return false
  const trimmed = src.trim()
  if (!trimmed) return false
  try {
    const u = new URL(trimmed)
    if (u.protocol !== "https:") return false
    if (ALLOWED_AVATAR_HOSTS.includes(u.hostname as (typeof ALLOWED_AVATAR_HOSTS)[number])) {
      return true
    }
    // googleusercontent subdominios (lh3, lh4, …)
    if (u.hostname.endsWith(".googleusercontent.com")) return true
    return false
  } catch {
    return false
  }
}

/**
 * Foto de Google al tamaño que se muestra (por defecto viene en 96 px; "=s64-c" la pide
 * cuadrada de 64, 2x para el círculo de 32 px de la barra). Las demás URLs, iguales.
 */
export function avatarAtSize(src: string, size: number): string {
  try {
    const u = new URL(src)
    if (!u.hostname.endsWith(".googleusercontent.com")) return src
    const base = src.replace(/=[sw]\d+[^/]*$/, "")
    return `${base}=s${size}-c`
  } catch {
    return src
  }
}
