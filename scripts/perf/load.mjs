#!/usr/bin/env node
// Prueba de carga simple: N conexiones a la vez durante unos segundos, como el pico
// de un posteo de Instagram. Sin dependencias.
//
//   npm run perf:load -- https://prueba.celimap.com.ar
//   npm run perf:load -- https://prueba.celimap.com.ar --connections 30 --seconds 20
//
// Correla contra prueba, no contra producción. Mientras corre, mirá en el VPS
// `top` (CPU del proceso de Next) y en Atlas las conexiones.
import { fmtMs, normalizeBaseUrl, parseArgs, printTable, quantile, saveResult } from "./_util.mjs"

const { flags, positional } = parseArgs()
if (!positional[0]) {
  console.error("Pasá la URL de prueba: npm run perf:load -- https://prueba.celimap.com.ar")
  process.exit(2)
}
const base = normalizeBaseUrl(positional[0])
const connections = Number(flags.connections) > 0 ? Number(flags.connections) : 20
const seconds = Number(flags.seconds) > 0 ? Number(flags.seconds) : 20

// Solo páginas: las APIs públicas tienen rate limit por IP (90 por minuto) y desde
// una sola compu darían 429 enseguida.
const TARGETS = [
  { label: "Home", path: "/" },
  { label: "Landing de ciudad", path: "/sin-gluten/cordoba" },
  { label: "Ficha", path: "/lugar/la-casa-del-celiaco-cordoba" },
]

async function hammer(path) {
  const latencies = []
  const statuses = {}
  let errors = 0
  const deadline = Date.now() + seconds * 1000
  async function worker() {
    while (Date.now() < deadline) {
      const start = performance.now()
      try {
        const res = await fetch(`${base}${path}`, { headers: { "user-agent": "celimap-perf-load" } })
        await res.arrayBuffer()
        statuses[res.status] = (statuses[res.status] ?? 0) + 1
        latencies.push(performance.now() - start)
      } catch {
        errors++
      }
    }
  }
  await Promise.all(Array.from({ length: connections }, worker))
  return {
    requests: latencies.length,
    rps: latencies.length / seconds,
    p50: quantile(latencies, 0.5),
    p95: quantile(latencies, 0.95),
    p99: quantile(latencies, 0.99),
    statuses,
    errors,
  }
}

console.log(`Carga contra ${base}: ${connections} conexiones, ${seconds} s por URL…\n`)
const results = []
for (const target of TARGETS) {
  process.stdout.write(`${target.label}… `)
  results.push({ ...target, ...(await hammer(target.path)) })
  process.stdout.write("listo\n")
}

console.log("")
printTable(
  ["URL", "Requests", "Por segundo", "p50", "p95", "p99", "Estados", "Errores"],
  results.map((r) => [
    r.label,
    r.requests,
    r.rps.toFixed(0),
    fmtMs(r.p50),
    fmtMs(r.p95),
    fmtMs(r.p99),
    Object.entries(r.statuses)
      .map(([code, n]) => `${code}×${n}`)
      .join(" "),
    r.errors,
  ])
)
console.log("\nTodo lo que no sea 200 es un problema. p95 de varios segundos = el servidor hace fila (mirá la CPU).")

const file = saveResult("load", { at: new Date().toISOString(), base, connections, seconds, results })
console.log(`Guardado en ${file}`)
