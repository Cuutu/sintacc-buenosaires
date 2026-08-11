/**
 * Same-origin / CSRF-ish helpers for destructive authenticated APIs.
 */

import type { NextRequest } from "next/server"

export function isAllowedRequestOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin") || ""
  const host = request.headers.get("host") || ""
  const candidates = [origin, host].filter(Boolean)
  if (candidates.length === 0) return true
  return candidates.some((c) => {
    const v = c.toLowerCase()
    return (
      v.includes("celimap.com.ar") ||
      v.includes("localhost") ||
      v.includes("127.0.0.1") ||
      v.includes("vercel.app")
    )
  })
}
