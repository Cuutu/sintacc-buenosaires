import { sanitizeReturnTo } from "@/lib/auth-return-to"

/**
 * Parsea deep links de retorno OAuth.
 * Binario TestFlight actual: celimap://auth/handoff
 * auth/callback aceptado para compat futura.
 */
export function parseNativeAuthHandoffUrl(
  url: string
): { code: string; next: string } | null {
  if (!url.startsWith("celimap://")) return null

  const rest = url.slice("celimap://".length)
  const queryIndex = rest.indexOf("?")
  const path = queryIndex >= 0 ? rest.slice(0, queryIndex) : rest
  if (path !== "auth/handoff" && path !== "auth/callback") return null

  const params = new URLSearchParams(
    queryIndex >= 0 ? rest.slice(queryIndex + 1) : ""
  )
  const code = params.get("code")
  if (!code || code.length < 16 || code.length > 128) return null
  if (!/^[a-fA-F0-9]+$/.test(code)) return null

  const next = sanitizeReturnTo(params.get("next"))
  return { code, next }
}
