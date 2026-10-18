/**
 * Rate limit en memoria del proceso, para límites altos y de mucho tráfico
 * (lecturas públicas, analytics) donde escribir en Mongo en cada request cuesta
 * más que lo que protege.
 *
 * Ventana fija por clave. En el servidor propio corre un solo proceso de Next,
 * así que el conteo es el mismo para todos los requests. Si algún día hay varios
 * procesos, cada uno cuenta por su lado (el límite efectivo se multiplica): para
 * lecturas públicas, que son fail-open igual, está bien.
 *
 * Para límites que tienen que sobrevivir a un reinicio o que protegen algo caro
 * (chat, login, contacto, sugerencias), seguí usando checkRateLimitByIp (Mongo).
 */

export type MemoryRateLimitResult = {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

type Bucket = { count: number; resetAt: number }

/** Tope de claves en memoria. Al llegar, se borran las vencidas y, si no alcanza, todas. */
export const MEMORY_RATE_LIMIT_MAX_KEYS = 50_000
const SWEEP_EVERY_MS = 30_000

type Store = { buckets: Map<string, Bucket>; lastSweep: number }

const globalStore = globalThis as typeof globalThis & { __celimapMemoryRateLimit?: Store }

function store(): Store {
  if (!globalStore.__celimapMemoryRateLimit) {
    globalStore.__celimapMemoryRateLimit = { buckets: new Map(), lastSweep: 0 }
  }
  return globalStore.__celimapMemoryRateLimit
}

function sweep(s: Store, now: number) {
  const full = s.buckets.size >= MEMORY_RATE_LIMIT_MAX_KEYS
  if (!full && now - s.lastSweep < SWEEP_EVERY_MS) return
  s.lastSweep = now
  for (const [key, bucket] of s.buckets) {
    if (bucket.resetAt <= now) s.buckets.delete(key)
  }
  // Si después de limpiar sigue lleno (muchísimas IPs en la misma ventana),
  // se vacía: preferimos dejar pasar de más a crecer sin techo.
  if (s.buckets.size >= MEMORY_RATE_LIMIT_MAX_KEYS) s.buckets.clear()
}

/** Suma un hit a `key` y dice si sigue dentro de `maxCount` por ventana de `windowMs`. */
export function hitMemoryRateLimit(
  key: string,
  maxCount: number,
  windowMs: number,
  now: number = Date.now()
): MemoryRateLimitResult {
  const s = store()
  sweep(s, now)

  let bucket = s.buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs }
    s.buckets.set(key, bucket)
  }
  bucket.count += 1

  return {
    allowed: bucket.count <= maxCount,
    remaining: Math.max(0, maxCount - bucket.count),
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  }
}

/** Solo para tests. */
export function __resetMemoryRateLimitForTests() {
  globalStore.__celimapMemoryRateLimit = { buckets: new Map(), lastSweep: 0 }
}

export function __memoryRateLimitSizeForTests(): number {
  return store().buckets.size
}
