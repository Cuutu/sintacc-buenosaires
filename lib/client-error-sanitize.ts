/** Sanitización de mensajes/stacks cliente — sin PII. */

export function sanitizeMessage(raw: string): string {
  return raw
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, "Bearer [redacted]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/pk\.[A-Za-z0-9.\-_]+/g, "pk.[redacted]")
    .replace(/(cookie|set-cookie|authorization)\s*[:=]\s*[^\s,;]+/gi, "$1=[redacted]")
    .replace(/[-+]?\d{1,3}\.\d{4,}/g, "[coord]")
    .replace(/[?&](token|access_token|refresh_token|id_token|code|state)=[^&\s]*/gi, "")
    .slice(0, 500)
}

export function sanitizeStack(stack?: string): string | undefined {
  if (!stack) return undefined
  return stack
    .split("\n")
    .slice(0, 16)
    .map((line) =>
      line
        .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
        .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, "Bearer [redacted]")
        .replace(/[?&](token|access_token|refresh_token|id_token|code|state)=[^&\s]*/gi, "")
        .slice(0, 240)
    )
    .join("\n")
    .slice(0, 3500)
}
