/**
 * Reload-once ante ChunkLoadError / fallo de import dinámico.
 * Clave GLOBAL por build (sin pathname). Máx. 1 reload automático / sesión-build.
 */

import { sanitizeMessage } from "@/lib/client-error-reporter"

export const CHUNK_RELOAD_STORAGE_PREFIX = "celimap_chunk_reload_v1:"

const CHUNK_FAIL_RE =
  /^(ChunkLoadError\b)|(^Loading chunk .+ failed)|Failed to fetch dynamically imported module|Importing a module script failed/i

export function isPreciseChunkLoadFailure(error: unknown): boolean {
  if (error == null) return false
  if (typeof error === "string") return CHUNK_FAIL_RE.test(error.trim())
  if (error instanceof Error) {
    const blob = `${error.name}: ${error.message}`.trim()
    if (error.name === "ChunkLoadError") return true
    return CHUNK_FAIL_RE.test(error.message) || CHUNK_FAIL_RE.test(blob)
  }
  return CHUNK_FAIL_RE.test(String(error))
}

export function chunkReloadBuildId(): string {
  return (
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
    process.env.NEXT_PUBLIC_BUILD_ID ||
    "local"
  ).slice(0, 16)
}

/** Clave global por build — NO incluye pathname. */
export function chunkReloadStorageKey(): string {
  return `${CHUNK_RELOAD_STORAGE_PREFIX}${chunkReloadBuildId()}`
}

export type ChunkReloadDecision =
  | { action: "reload"; key: string }
  | { action: "fallback"; key: string; reason: "already_reloaded" }
  | { action: "noop"; reason: string }

type StoredPayload = {
  state: "pending" | "done"
  route?: string
  message?: string
}

function readPayload(storage: Pick<Storage, "getItem">, key: string): StoredPayload | null {
  try {
    const raw = storage.getItem(key)
    if (!raw) return null
    if (raw === "pending" || raw === "done") return { state: raw }
    const parsed = JSON.parse(raw) as StoredPayload
    if (parsed?.state === "pending" || parsed?.state === "done") return parsed
    return null
  } catch {
    return null
  }
}

function writePayload(
  storage: Pick<Storage, "setItem">,
  key: string,
  payload: StoredPayload
): void {
  storage.setItem(key, JSON.stringify(payload))
}

/**
 * Decide reload vs fallback. sessionStorage global por build.
 * Valor guarda pathname + mensaje sanitizado solo como diagnóstico.
 */
export function decideChunkReload(
  error: unknown,
  opts: {
    route?: string
    storage?: Pick<Storage, "getItem" | "setItem">
  } = {}
): ChunkReloadDecision {
  if (!isPreciseChunkLoadFailure(error)) {
    return { action: "noop", reason: "not_chunk_fingerprint" }
  }
  const key = chunkReloadStorageKey()
  const storage =
    opts.storage ??
    (typeof sessionStorage !== "undefined" ? sessionStorage : undefined)
  if (!storage) {
    return { action: "fallback", key, reason: "already_reloaded" }
  }
  const route =
    opts.route ??
    (typeof window !== "undefined" ? window.location.pathname : "/")
  const message =
    error instanceof Error
      ? sanitizeMessage(error.message)
      : sanitizeMessage(String(error))

  try {
    const prev = readPayload(storage, key)
    if (prev?.state === "done" || prev?.state === "pending") {
      writePayload(storage, key, {
        state: "done",
        route: prev.route || route,
        message: prev.message || message,
      })
      return { action: "fallback", key, reason: "already_reloaded" }
    }
    writePayload(storage, key, { state: "pending", route, message })
    return { action: "reload", key }
  } catch {
    return { action: "fallback", key, reason: "already_reloaded" }
  }
}

/** Tras reload: pending → done. */
export function markChunkReloadSettled(): void {
  if (typeof sessionStorage === "undefined") return
  const key = chunkReloadStorageKey()
  try {
    const prev = readPayload(sessionStorage, key)
    if (prev?.state === "pending") {
      writePayload(sessionStorage, key, { ...prev, state: "done" })
    }
  } catch {
    /* ignore */
  }
}

export function __resetChunkReloadKeysForTests(): void {
  if (typeof sessionStorage === "undefined") return
  try {
    const keys: string[] = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i)
      if (k && k.startsWith(CHUNK_RELOAD_STORAGE_PREFIX)) keys.push(k)
    }
    keys.forEach((k) => sessionStorage.removeItem(k))
  } catch {
    /* ignore */
  }
}
