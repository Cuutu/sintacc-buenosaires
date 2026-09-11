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
  return undefined
}

export function getFriendlyChatError(error: unknown): string {
  const status = getErrorStatusCode(error)
  if (status === 401 || status === 403) return CHAT_FRIENDLY_CONFIG_ERROR
  if (status === 402) return CHAT_FRIENDLY_CREDITS_ERROR
  if (status === 429) return CHAT_FRIENDLY_BUSY_ERROR

  const message = error instanceof Error ? error.message : String(error)
  if (/401|api key|unauthorized|OPENROUTER_API_KEY/i.test(message)) {
    return CHAT_FRIENDLY_CONFIG_ERROR
  }
  if (/402|credit|insufficient|payment|saldo|quota/i.test(message)) {
    return CHAT_FRIENDLY_CREDITS_ERROR
  }
  if (/429|rate limit|too many/i.test(message)) {
    return CHAT_FRIENDLY_BUSY_ERROR
  }

  return CHAT_FRIENDLY_ERROR
}
