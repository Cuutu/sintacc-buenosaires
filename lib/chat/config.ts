import { getBaseUrl } from "@/lib/base-url"

export const CHAT_MAX_USER_MESSAGE_CHARS = 1500
export const CHAT_MAX_ASSISTANT_MESSAGE_CHARS = 4000
export const CHAT_MAX_HISTORY_MESSAGES = 12
export const CHAT_MAX_HISTORY_CHARS = 8000
export const CHAT_MAX_PAYLOAD_CHARS = 16000
export const CHAT_MAX_OUTPUT_TOKENS = 800
export const CHAT_MAX_STEPS = 5
export const CHAT_APP_STORE_URL = "https://apps.apple.com/app/id6797278308"
export const CHAT_ANMAT_LIST_URL = "https://listadoalg.anmat.gob.ar/Home"

const DEFAULT_MODEL = "openai/gpt-4.1-mini"

function parseEnvInt(name: string, fallback: number, min: number, max: number): number {
  const n = Number(process.env[name])
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.trunc(n)))
}

export function getChatModelId(): string {
  return (
    process.env.OPENROUTER_MODEL?.trim() ||
    process.env.OPENROUTER_TEXT_MODEL?.trim() ||
    DEFAULT_MODEL
  )
}

export function getChatOpenRouterApiKey(): string | null {
  const chatKey = process.env.OPENROUTER_CHAT_API_KEY?.trim()
  if (chatKey) return chatKey
  return process.env.OPENROUTER_API_KEY?.trim() || null
}

export function isChatTestEnabled(): boolean {
  if (process.env.CHAT_TEST_ENABLED === "true") return true
  return process.env.NODE_ENV !== "production"
}

export function getChatRateLimitConfig(): {
  type: string
  maxCount: number
  windowMinutes: number
} {
  return {
    type: "chat",
    maxCount: parseEnvInt("CHAT_RATE_LIMIT_MAX", 20, 1, 200),
    windowMinutes: parseEnvInt("CHAT_RATE_WINDOW_MINUTES", 15, 1, 1440),
  }
}

export function getOpenRouterHeaders(): Record<string, string> {
  return {
    "HTTP-Referer": getBaseUrl(),
    "X-Title": "CeliMap Chat",
  }
}
