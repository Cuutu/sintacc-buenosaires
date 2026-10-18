/**
 * @jest-environment node
 */
import {
  MEMORY_RATE_LIMIT_MAX_KEYS,
  __memoryRateLimitSizeForTests,
  __resetMemoryRateLimitForTests,
  hitMemoryRateLimit,
} from "@/lib/memory-rate-limit"

describe("hitMemoryRateLimit", () => {
  beforeEach(() => __resetMemoryRateLimitForTests())

  it("deja pasar hasta el máximo y frena el siguiente", () => {
    const now = 1_000_000
    for (let i = 1; i <= 3; i++) {
      expect(hitMemoryRateLimit("k", 3, 60_000, now).allowed).toBe(true)
    }
    const fourth = hitMemoryRateLimit("k", 3, 60_000, now + 10_000)
    expect(fourth.allowed).toBe(false)
    expect(fourth.remaining).toBe(0)
    expect(fourth.retryAfterSeconds).toBe(50)
  })

  it("cuenta cada clave por separado", () => {
    expect(hitMemoryRateLimit("a", 1, 60_000, 0).allowed).toBe(true)
    expect(hitMemoryRateLimit("b", 1, 60_000, 0).allowed).toBe(true)
    expect(hitMemoryRateLimit("a", 1, 60_000, 0).allowed).toBe(false)
  })

  it("arranca de cero cuando vence la ventana", () => {
    expect(hitMemoryRateLimit("k", 1, 60_000, 0).allowed).toBe(true)
    expect(hitMemoryRateLimit("k", 1, 60_000, 59_999).allowed).toBe(false)
    const next = hitMemoryRateLimit("k", 1, 60_000, 60_000)
    expect(next.allowed).toBe(true)
    expect(next.remaining).toBe(0)
  })

  it("borra las claves vencidas y no crece sin techo", () => {
    for (let i = 0; i < 100; i++) hitMemoryRateLimit(`old-${i}`, 5, 1_000, 0)
    expect(__memoryRateLimitSizeForTests()).toBe(100)
    hitMemoryRateLimit("new", 5, 1_000, 60_000)
    expect(__memoryRateLimitSizeForTests()).toBe(1)

    for (let i = 0; i < MEMORY_RATE_LIMIT_MAX_KEYS + 10; i++) {
      hitMemoryRateLimit(`ip-${i}`, 5, 60_000, 120_000)
    }
    expect(__memoryRateLimitSizeForTests()).toBeLessThanOrEqual(MEMORY_RATE_LIMIT_MAX_KEYS)
  })
})
