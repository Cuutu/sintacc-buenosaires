/**
 * @jest-environment node
 */
import {
  isPreciseChunkLoadFailure,
  decideChunkReload,
  chunkReloadStorageKey,
  CHUNK_RELOAD_STORAGE_PREFIX,
} from "@/lib/chunk-reload"

function memStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    clear: () => map.clear(),
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => {
      map.set(k, String(v))
    },
    removeItem: (k: string) => {
      map.delete(k)
    },
    key: (i: number) => Array.from(map.keys())[i] ?? null,
  }
}

describe("chunk-reload fingerprints + clave global", () => {
  it("acepta solo fingerprints precisos", () => {
    expect(isPreciseChunkLoadFailure(new Error("ChunkLoadError"))).toBe(true)
    const named = new Error("Loading chunk 123 failed")
    named.name = "ChunkLoadError"
    expect(isPreciseChunkLoadFailure(named)).toBe(true)
    expect(
      isPreciseChunkLoadFailure(new Error("Failed to fetch dynamically imported module: /x.js"))
    ).toBe(true)
    expect(isPreciseChunkLoadFailure(new Error("API 500"))).toBe(false)
    expect(isPreciseChunkLoadFailure(new Error("WebGL context lost"))).toBe(false)
    expect(isPreciseChunkLoadFailure(new Error("Invalid src prop"))).toBe(false)
    expect(isPreciseChunkLoadFailure(new Error("Failed to fetch"))).toBe(false)
  })

  it("clave global por build sin pathname; 2ª falla → fallback", () => {
    const storage = memStorage()
    const err = new Error("Loading chunk 7 failed")
    err.name = "ChunkLoadError"
    const key = chunkReloadStorageKey()
    expect(key.startsWith(CHUNK_RELOAD_STORAGE_PREFIX)).toBe(true)
    expect(key.includes("/favoritos")).toBe(false)

    const first = decideChunkReload(err, { route: "/favoritos", storage })
    expect(first.action).toBe("reload")
    const stored = JSON.parse(storage.getItem(key)!)
    expect(stored.state).toBe("pending")
    expect(stored.route).toBe("/favoritos")

    const second = decideChunkReload(err, { route: "/perfil", storage })
    expect(second.action).toBe("fallback")
    if (second.action === "fallback") {
      expect(second.key).toBe(key)
    }
  })
})
