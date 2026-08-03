/**
 * Telemetría OAuth nativo — sin PII, sin query, sin tokens.
 */

import { reportClientError, type ClientErrorSource } from "@/lib/client-error-reporter"

export type NativeOAuthStage =
  | "native-oauth-start"
  | "native-oauth-browser-opened"
  | "native-oauth-return"
  | "native-oauth-session-ready"
  | "native-oauth-error"

const stages = new Set<NativeOAuthStage>([
  "native-oauth-start",
  "native-oauth-browser-opened",
  "native-oauth-return",
  "native-oauth-session-ready",
  "native-oauth-error",
])

export function reportNativeOAuth(
  stage: NativeOAuthStage,
  opts?: {
    route?: string
    code?: string
    browser?: boolean
    deepLink?: boolean
    durationMs?: number
  }
): void {
  if (!stages.has(stage)) return
  const parts = [
    `stage=${stage}`,
    opts?.code ? `code=${opts.code.slice(0, 40)}` : null,
    typeof opts?.browser === "boolean" ? `browser=${opts.browser}` : null,
    typeof opts?.deepLink === "boolean" ? `deepLink=${opts.deepLink}` : null,
    typeof opts?.durationMs === "number" ? `ms=${Math.round(opts.durationMs)}` : null,
  ].filter(Boolean)

  reportClientError({
    source: stage as ClientErrorSource,
    error: new Error(parts.join(" ")),
    route: opts?.route,
  })
}
