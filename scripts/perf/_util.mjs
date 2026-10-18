// Utilidades compartidas por los scripts de medición (perf:lab, perf:bundle, perf:server).
import fs from "node:fs"
import path from "node:path"

export const RESULTS_DIR = path.join(process.cwd(), "perf-results")

/** URLs que medimos siempre: una por tipo de página importante. */
export const DEFAULT_PAGES = [
  "/",
  "/mapa",
  "/lugar/la-casa-del-celiaco-cordoba",
  "/sin-gluten/cordoba",
  "/sin-gluten/provincia/caba",
]

export function parseArgs(argv = process.argv.slice(2)) {
  const flags = {}
  const positional = []
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg.startsWith("--")) {
      const [key, inline] = arg.slice(2).split("=")
      if (inline !== undefined) flags[key] = inline
      else if (argv[i + 1] && !argv[i + 1].startsWith("--")) flags[key] = argv[++i]
      else flags[key] = true
    } else {
      positional.push(arg)
    }
  }
  return { flags, positional }
}

export function normalizeBaseUrl(raw) {
  const base = (raw || "https://www.celimap.com.ar").trim().replace(/\/+$/, "")
  if (!/^https?:\/\//.test(base)) throw new Error(`URL base inválida: ${raw}`)
  return base
}

export function median(values) {
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b)
  if (sorted.length === 0) return null
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export function quantile(values, q) {
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b)
  if (sorted.length === 0) return null
  const rank = q * (sorted.length - 1)
  const lo = Math.floor(rank)
  const hi = Math.ceil(rank)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (rank - lo)
}

/** Tabla de texto simple, alineada, sin dependencias. */
export function printTable(headers, rows) {
  const cells = [headers, ...rows].map((row) => row.map((c) => (c == null ? "—" : String(c))))
  const widths = headers.map((_, i) => Math.max(...cells.map((row) => row[i].length)))
  const line = (row) => row.map((c, i) => (i === 0 ? c.padEnd(widths[i]) : c.padStart(widths[i]))).join("  ")
  console.log(line(cells[0]))
  console.log(widths.map((w) => "-".repeat(w)).join("  "))
  for (const row of cells.slice(1)) console.log(line(row))
}

export function saveResult(kind, data) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
  const file = path.join(RESULTS_DIR, `${kind}-${stamp}.json`)
  fs.writeFileSync(file, JSON.stringify(data, null, 2))
  return file
}

export function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"))
}

export function fmtMs(ms) {
  if (ms == null) return null
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`
}

export function fmtKb(bytes) {
  if (bytes == null) return null
  return `${(bytes / 1024).toFixed(0)} KB`
}
