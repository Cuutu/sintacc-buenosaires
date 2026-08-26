import { parseNativeAuthHandoffUrl } from "@/lib/native-auth-deeplink"

const STORAGE_PREFIX = "celimap:handoff:v1:"
const memoryClaimed = new Set<string>()

export type ClaimedHandoff = { code: string; next: string }

function storageKey(id: string): string {
  return `${STORAGE_PREFIX}${id}`
}

function readClaimed(id: string): boolean {
  if (memoryClaimed.has(id)) return true
  try {
    if (typeof sessionStorage === "undefined") return false
    return sessionStorage.getItem(storageKey(id)) === "1"
  } catch {
    return false
  }
}

function writeClaimed(id: string): void {
  memoryClaimed.add(id)
  try {
    if (typeof sessionStorage === "undefined") return
    sessionStorage.setItem(storageKey(id), "1")
  } catch {
    // Private mode / quota: memory still blocks this JS context.
  }
}

function releaseClaimed(id: string): void {
  memoryClaimed.delete(id)
  try {
    if (typeof sessionStorage === "undefined") return
    sessionStorage.removeItem(storageKey(id))
  } catch {
    /* ignore */
  }
}

/** Test helper — clear session + memory between cases. */
export function __resetHandoffOnceForTests(): void {
  memoryClaimed.clear()
  try {
    if (typeof sessionStorage === "undefined") return
    const keys: string[] = []
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i)
      if (key?.startsWith(STORAGE_PREFIX)) keys.push(key)
    }
    keys.forEach((key) => sessionStorage.removeItem(key))
  } catch {
    /* ignore */
  }
}

/**
 * Claim a launch/open URL once per browser session.
 * Invalid / empty / already-claimed → null. Never throws.
 */
export function claimHandoffFromUrl(url: unknown): ClaimedHandoff | null {
  if (typeof url !== "string" || url.length === 0) return null
  const parsed = parseNativeAuthHandoffUrl(url)
  if (!parsed) return null
  if (readClaimed(parsed.code)) return null
  writeClaimed(parsed.code)
  return parsed
}

export function createLaunchUrlHandler(deps: {
  assign: (href: string) => void
  closeBrowser?: () => Promise<void>
  isCancelled?: () => boolean
  onClaimed?: (handoff: ClaimedHandoff) => void
}) {
  return async function handleLaunchUrl(url: unknown): Promise<boolean> {
    if (deps.isCancelled?.()) return false
    const handoff = claimHandoffFromUrl(url)
    if (!handoff) return false
    if (deps.closeBrowser) {
      try {
        await deps.closeBrowser()
      } catch {
        /* Browser may already be closed */
      }
    }
    if (deps.isCancelled?.()) {
      releaseClaimed(handoff.code)
      return false
    }
    deps.onClaimed?.(handoff)
    const params = new URLSearchParams({
      code: handoff.code,
      next: handoff.next,
    })
    deps.assign(`/api/auth/handoff?${params.toString()}`)
    return true
  }
}
