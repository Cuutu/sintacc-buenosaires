#!/usr/bin/env tsx

type EndpointDef = {
  name: string
  path: string
  requiresAdmin?: boolean
}

type RunResult = {
  ms: number
  status: number
  ok: boolean
  error?: string
}

const BASE_URL = (process.env.BENCH_BASE_URL || "http://localhost:3000").replace(/\/$/, "")
const RUNS = Math.max(1, parseInt(process.env.BENCH_RUNS || "12", 10))
const WARMUP = Math.max(0, parseInt(process.env.BENCH_WARMUP || "2", 10))
const TIMEOUT_MS = Math.max(1000, parseInt(process.env.BENCH_TIMEOUT_MS || "15000", 10))
const ADMIN_COOKIE = process.env.BENCH_COOKIE || ""
const ONLY = (process.env.BENCH_ONLY || "")
  .split(",")
  .map((v) => v.trim().toLowerCase())
  .filter(Boolean)

const endpoints: EndpointDef[] = [
  { name: "public:places:list", path: "/api/places?limit=20&page=1" },
  { name: "public:places:buenos-aires", path: "/api/places?limit=200&citySlugs=buenos-aires" },
  { name: "public:places:salta", path: "/api/places?limit=200&citySlugs=salta" },
  { name: "public:stats", path: "/api/stats" },
  { name: "admin:counts", path: "/api/admin/counts", requiresAdmin: true },
  {
    name: "admin:places:filtered",
    path: "/api/admin/places?status=approved&page=1&limit=25&missingInfo=1",
    requiresAdmin: true,
  },
]

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))
  return sorted[idx]
}

function avg(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((acc, n) => acc + n, 0) / values.length
}

async function timedFetch(url: string, headers: Record<string, string>): Promise<RunResult> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  const start = performance.now()
  try {
    const res = await fetch(url, {
      method: "GET",
      headers,
      signal: controller.signal,
      cache: "no-store",
    })
    const end = performance.now()
    return {
      ms: end - start,
      status: res.status,
      ok: res.ok,
    }
  } catch (error: any) {
    const end = performance.now()
    return {
      ms: end - start,
      status: 0,
      ok: false,
      error: error?.name === "AbortError" ? "timeout" : String(error?.message || error),
    }
  } finally {
    clearTimeout(timeout)
  }
}

async function runEndpoint(def: EndpointDef) {
  const isAdmin = !!def.requiresAdmin
  if (isAdmin && !ADMIN_COOKIE) {
    console.log(`- ${def.name}: SKIP (falta BENCH_COOKIE)`)
    return
  }
  if (ONLY.length && !ONLY.some((tag) => def.name.toLowerCase().includes(tag))) {
    return
  }

  const headers: Record<string, string> = { Accept: "application/json" }
  if (isAdmin && ADMIN_COOKIE) headers.Cookie = ADMIN_COOKIE
  const url = `${BASE_URL}${def.path}`

  process.stdout.write(`- ${def.name}: warmup ${WARMUP}, runs ${RUNS} ... `)

  for (let i = 0; i < WARMUP; i++) {
    await timedFetch(url, headers)
  }

  const runs: RunResult[] = []
  for (let i = 0; i < RUNS; i++) {
    runs.push(await timedFetch(url, headers))
  }

  const okRuns = runs.filter((r) => r.ok)
  const timings = okRuns.map((r) => r.ms)
  const statusCount = runs.reduce<Record<string, number>>((acc, r) => {
    const key = r.status ? String(r.status) : `ERR:${r.error || "unknown"}`
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  if (timings.length === 0) {
    console.log(`FAIL (${JSON.stringify(statusCount)})`)
    return
  }

  const line = [
    `ok=${okRuns.length}/${runs.length}`,
    `avg=${avg(timings).toFixed(1)}ms`,
    `p50=${percentile(timings, 50).toFixed(1)}ms`,
    `p95=${percentile(timings, 95).toFixed(1)}ms`,
    `min=${Math.min(...timings).toFixed(1)}ms`,
    `max=${Math.max(...timings).toFixed(1)}ms`,
    `status=${JSON.stringify(statusCount)}`,
  ].join(" | ")
  console.log(line)
}

async function main() {
  console.log("API benchmark")
  console.log(`base=${BASE_URL}`)
  console.log(`runs=${RUNS}, warmup=${WARMUP}, timeout=${TIMEOUT_MS}ms`)
  if (!ADMIN_COOKIE) {
    console.log("admin cookie: not set (admin endpoints will be skipped)")
  } else {
    console.log("admin cookie: set")
  }
  if (ONLY.length) {
    console.log(`filter=${ONLY.join(",")}`)
  }
  console.log("")

  for (const def of endpoints) {
    await runEndpoint(def)
  }
}

main().catch((error) => {
  console.error("benchmark failed:", error)
  process.exit(1)
})

