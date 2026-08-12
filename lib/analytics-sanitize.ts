const FORBIDDEN_KEY = /(token|email|password|secret|privateAccess|authorization)/i
const FORBIDDEN_VALUE = /listas\/privadas\/[A-Za-z0-9_-]{8,}|@[\w.-]+\.\w+/i

/** Quita PII / secretos de props de analítica. */
export function sanitizeAnalyticsProps(
  properties?: Record<string, string | number | boolean>
): Record<string, string | number | boolean> | undefined {
  if (!properties) return undefined
  const out: Record<string, string | number | boolean> = {}
  for (const [key, value] of Object.entries(properties)) {
    if (FORBIDDEN_KEY.test(key)) continue
    if (typeof value === "string" && FORBIDDEN_VALUE.test(value)) continue
    out[key] = value
  }
  return Object.keys(out).length ? out : undefined
}
