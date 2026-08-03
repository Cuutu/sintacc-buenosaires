/**
 * returnTo / next internos — sin open redirect.
 */

const BLOCKED_SCHEME = /^(javascript|data|vbscript|file|about):/i

export function sanitizeReturnTo(raw: unknown, fallback = "/perfil"): string {
  if (typeof raw !== "string" || !raw) return fallback

  let value = raw.trim()
  try {
    value = decodeURIComponent(value)
  } catch {
    /* keep raw */
  }
  value = value.trim()

  if (!value.startsWith("/")) return fallback
  if (value.startsWith("//")) return fallback
  if (value.includes("://")) return fallback
  if (BLOCKED_SCHEME.test(value)) return fallback
  if (/[\x00-\x1f\x7f]/.test(value)) return fallback
  // Barras unicode / backslash tricks
  if (value.includes("\\") || /%2f%2f/i.test(raw as string)) return fallback
  if (value.length > 200) return fallback

  return value
}

export function isAllowedReturnTo(raw: unknown): boolean {
  if (typeof raw !== "string" || !raw) return false
  return sanitizeReturnTo(raw, "") === raw || sanitizeReturnTo(raw, "") === decodeSafe(raw)
}

function decodeSafe(raw: string): string {
  try {
    return decodeURIComponent(raw.trim())
  } catch {
    return raw.trim()
  }
}
