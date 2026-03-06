type CacheEntry<T> = {
  value: T
  expiresAt: number
}

type ApiCacheStore = Map<string, CacheEntry<unknown>>

declare global {
  // eslint-disable-next-line no-var
  var __celimapApiCache: ApiCacheStore | undefined
}

function getStore(): ApiCacheStore {
  if (!global.__celimapApiCache) {
    global.__celimapApiCache = new Map<string, CacheEntry<unknown>>()
  }
  return global.__celimapApiCache
}

export async function getOrSetApiCache<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>
): Promise<T> {
  const now = Date.now()
  const store = getStore()
  const cached = store.get(key)

  if (cached && cached.expiresAt > now) {
    return cached.value as T
  }

  const value = await loader()
  store.set(key, { value, expiresAt: now + ttlMs })
  return value
}

export function invalidateApiCache(prefixes: string[]) {
  if (!prefixes.length) return
  const store = getStore()
  for (const key of store.keys()) {
    if (prefixes.some((prefix) => key.startsWith(prefix))) {
      store.delete(key)
    }
  }
}
