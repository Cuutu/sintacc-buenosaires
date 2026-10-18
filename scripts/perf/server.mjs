#!/usr/bin/env node
// Tiempos del servidor: HTML de las páginas clave y la API, uno solo y en ráfagas.
//
//   npm run perf:server                              contra producción
//   npm run perf:server -- https://prueba.celimap.com.ar
//   npm run perf:server -- --runs 10
//
// Mide desde tu compu, así que incluye tu red. Comparar siempre desde el mismo lugar.
import { DEFAULT_PAGES, fmtMs, median, normalizeBaseUrl, parseArgs, printTable, quantile, saveResult } from "./_util.mjs"

const { flags, positional } = parseArgs()
const base = normalizeBaseUrl(positional[0])
const runs = Number(flags.runs) > 0 ? Number(flags.runs) : 5
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const API = [
  "/api/places?limit=100&page=1",
  "/api/places/near?lat=-34.6037&lng=-58.3816&radius=3000",
]

async function timeRequest(url) {
  const start = performance.now()
  const res = await fetch(url, { headers: { "user-agent": "celimap-perf-script" }, redirect: "manual" })
  const ttfb = performance.now() - start
  const body = await res.arrayBuffer()
  return {
    status: res.status,
    ttfb,
    total: performance.now() - start,
    bytes: body.byteLength,
    cache: res.headers.get("x-nextjs-cache") ?? res.headers.get("cache-control") ?? "",
  }
}

async function measureSequential(path) {
  const samples = []
  for (let i = 0; i < runs; i++) samples.push(await timeRequest(`${base}${path}`))
  const totals = samples.map((s) => s.total)
  return {
    path,
    status: samples.at(-1).status,
    medianTtfb: median(samples.map((s) => s.ttfb)),
    medianTotal: median(totals),
    p95Total: quantile(totals, 0.95),
    cache: samples.at(-1).cache,
  }
}

/** 6 requests a la vez a /api/places/near con coordenadas distintas (sin caché). */
async function burst(label, seed) {
  const urls = Array.from({ length: 6 }, (_, i) => {
    const lat = (-34.6 - (seed * 6 + i) * 0.001).toFixed(4)
    return `${base}/api/places/near?lat=${lat}&lng=-58.3816&radius=2000`
  })
  const times = (await Promise.all(urls.map((u) => timeRequest(u)))).map((r) => r.total)
  return { label, min: Math.min(...times), max: Math.max(...times), median: median(times) }
}

console.log(`Midiendo ${base} (${runs} requests por URL)…\n`)

const sequential = []
for (const path of [...DEFAULT_PAGES, ...API]) {
  try {
    sequential.push(await measureSequential(path))
  } catch (error) {
    sequential.push({ path, error: String(error) })
  }
}

printTable(
  ["URL", "Estado", "TTFB (mediana)", "Total (mediana)", "Total (p95)", "Caché"],
  sequential.map((r) =>
    r.error
      ? [r.path, "error", null, null, null, r.error.slice(0, 40)]
      : [r.path, r.status, fmtMs(r.medianTtfb), fmtMs(r.medianTotal), fmtMs(r.p95Total), r.cache.slice(0, 40)]
  )
)

console.log("\nRáfagas de 6 requests en paralelo (/api/places/near, sin caché):\n")
const bursts = []
bursts.push(await burst("1ª ráfaga", 1))
bursts.push(await burst("2ª ráfaga", 2))
bursts.push(await burst("3ª ráfaga", 3))
await sleep(6000)
bursts.push(await burst("después de 6 s sin tráfico", 4))
const single = await timeRequest(`${base}/api/places/near?lat=-34.7&lng=-58.3816&radius=2000`)

printTable(
  ["Ráfaga", "Mínimo", "Mediana", "Máximo"],
  bursts.map((b) => [b.label, fmtMs(b.min), fmtMs(b.median), fmtMs(b.max)])
)
console.log(`\nUn request solo, como referencia: ${fmtMs(single.total)}.`)
console.log("Si las ráfagas tardan mucho más que un request solo, el servidor está abriendo conexiones nuevas a Mongo o haciendo fila.")

const file = saveResult("server", { at: new Date().toISOString(), base, runs, sequential, bursts, single: single.total })
console.log(`\nGuardado en ${file}`)
