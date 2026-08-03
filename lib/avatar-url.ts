/**
 * Valida URL de avatar antes de next/image.
 * Solo https + hosts permitidos (remotePatterns).
 */

const ALLOWED_AVATAR_HOSTS = [
  "lh3.googleusercontent.com",
  "res.cloudinary.com",
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
