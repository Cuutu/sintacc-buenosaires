const EMAIL_OR_TOKEN = /@[\w.-]+\.\w+|listas\/privadas\/[A-Za-z0-9_-]{8,}/i

/** Query de búsqueda para analytics: texto de intención, nunca PII. */
export function sanitizeSearchQuery(raw: unknown): string | null {
  if (typeof raw !== "string") return null
  const query = raw.normalize("NFC").trim().slice(0, 80)
  if (query.length < 2) return null
  if (EMAIL_OR_TOKEN.test(query)) return null
  if (/\d{8,}/.test(query)) return null
  return query
}
