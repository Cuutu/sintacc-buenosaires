import { randomBytes } from "crypto"
import {
  PRIVATE_LIST_PATH_PREFIX,
  PRIVATE_TOKEN_BYTES,
} from "@/lib/lists/constants"

/** Token URL-safe, criptográficamente seguro (~43 chars). */
export function generatePrivateListToken(): string {
  return randomBytes(PRIVATE_TOKEN_BYTES).toString("base64url")
}

export function buildPrivateListPath(token: string): string {
  return `${PRIVATE_LIST_PATH_PREFIX}/${token}`
}

export function buildPrivateListUrl(baseUrl: string, token: string): string {
  const base = baseUrl.replace(/\/$/, "")
  return `${base}${buildPrivateListPath(token)}`
}

const TOKEN_IN_PATH_RE = /\/listas\/privadas\/[A-Za-z0-9_-]{16,}/g

/** Redacta tokens de rutas privadas en strings de log/error. */
export function redactPrivateListToken(value: string): string {
  return value.replace(TOKEN_IN_PATH_RE, `${PRIVATE_LIST_PATH_PREFIX}/[REDACTED]`)
}

export function redactPrivateListTokenDeep<T>(input: T): T {
  if (typeof input === "string") {
    return redactPrivateListToken(input) as T
  }
  if (Array.isArray(input)) {
    return input.map((item) => redactPrivateListTokenDeep(item)) as T
  }
  if (input && typeof input === "object") {
    const out: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(input)) {
      if (
        key === "privateAccessToken" ||
        key === "token" ||
        key === "privateToken"
      ) {
        out[key] = "[REDACTED]"
        continue
      }
      out[key] = redactPrivateListTokenDeep(value)
    }
    return out as T
  }
  return input
}

export function isValidPrivateTokenFormat(token: string): boolean {
  return /^[A-Za-z0-9_-]{32,64}$/.test(token)
}
