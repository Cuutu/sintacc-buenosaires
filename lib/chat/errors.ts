export const CHAT_FRIENDLY_ERROR =
  "Ahora no pude responder. Probá de nuevo en un rato."

export const CHAT_FRIENDLY_CREDITS_ERROR =
  "El asistente no está disponible por ahora. Probá más tarde."

export const CHAT_FRIENDLY_CONFIG_ERROR =
  "El chat no está configurado en este momento. Probá más tarde."

export const CHAT_FRIENDLY_BUSY_ERROR =
  "Hay mucha demanda ahora. Esperá un minuto y volvé a intentar."

function getErrorStatusCode(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined
  if ("statusCode" in error && typeof error.statusCode === "number") {
    return error.statusCode
  }
  if ("status" in error && typeof error.status === "number") {
    return error.status
  }
  return undefined
}

export function getChatErrorStatus(error: unknown): number {
  const fromField = getErrorStatusCode(error)
  if (fromField) return fromField

  const message = error instanceof Error ? error.message : String(error)
  if (/401|api key|unauthorized|user not found|OPENROUTER_API_KEY|OPENROUTER_CHAT_API_KEY/i.test(message)) {
    return 401
  }
  if (/402|credit|insufficient|payment|saldo|quota/i.test(message)) {
    return 402
  }
  if (/429|rate limit|too many/i.test(message)) {
    return 429
  }
  return 502
}

export function getFriendlyChatError(error: unknown): string {
  const status = getChatErrorStatus(error)
  if (status === 401 || status === 403) return CHAT_FRIENDLY_CONFIG_ERROR
  if (status === 402) return CHAT_FRIENDLY_CREDITS_ERROR
  if (status === 429) return CHAT_FRIENDLY_BUSY_ERROR
  return CHAT_FRIENDLY_ERROR
}

/** El transport de useChat tira el body crudo (JSON `{ error }`) en HTTP error. */
export function parseChatClientErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error)
  const trimmed = raw.trim()
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as { error?: unknown }
      if (typeof parsed.error === "string" && parsed.error.trim()) {
        return parsed.error.trim()
      }
    } catch {
      // no JSON
    }
  }
  if (
    trimmed.length > 0 &&
    trimmed.length < 280 &&
    !/openai|openrouter|stack|at http|ECONN/i.test(trimmed)
  ) {
    return trimmed
  }
  return getFriendlyChatError(error)
}

export function sanitizeChatErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error)
  return raw.replace(/sk-or-[a-zA-Z0-9_-]+/gi, "[redacted]")
}
