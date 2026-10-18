#!/usr/bin/env node
// JS de primera carga por ruta (gzip), leído del último `npm run build`.
//
//   npm run perf:bundle                     tabla + guarda perf-results/bundle-*.json
//   npm run perf:bundle -- --check          sale con error si alguna ruta pasa su presupuesto
//   npm run perf:bundle -- --baseline perf-results/bundle-XXXX.json   muestra la diferencia
//
// Cuenta lo mismo que el navegador baja antes de hidratar: los chunks del layout
// raíz más los de la página (sin repetir), comprimidos con gzip. No incluye los
// imports dinámicos (next/dynamic, React.lazy), que bajan después.
import fs from "node:fs"
import path from "node:path"
import zlib from "node:zlib"
import { fmtKb, parseArgs, printTable, readJson, saveResult } from "./_util.mjs"

const { flags } = parseArgs()
const nextDir = path.join(process.cwd(), ".next")
const manifestPath = path.join(nextDir, "app-build-manifest.json")

if (!fs.existsSync(manifestPath)) {
  console.error("No encuentro .next/app-build-manifest.json. Corré `npm run build` primero.")
  process.exit(2)
}

const budgets = readJson(path.join(process.cwd(), "scripts/perf/budgets.json"))
const ignore = (budgets.ignore ?? []).map((re) => new RegExp(re))
const pages = readJson(manifestPath).pages
const sizeCache = new Map()

function gzipSize(file) {
  if (sizeCache.has(file)) return sizeCache.get(file)
  const full = path.join(nextDir, file)
  const size = fs.existsSync(full) ? zlib.gzipSync(fs.readFileSync(full), { level: 9 }).length : 0
  sizeCache.set(file, size)
  return size
}

const layoutChunks = new Set((pages["/layout"] ?? []).filter((f) => f.endsWith(".js")))

const rows = Object.keys(pages)
  .filter((route) => route.endsWith("/page") && !ignore.some((re) => re.test(route)))
  .map((route) => {
    const chunks = new Set(layoutChunks)
    for (const file of pages[route]) if (file.endsWith(".js")) chunks.add(file)
    // Layouts intermedios (p. ej. /mapa/layout) también se cargan antes de hidratar.
    const segments = route.split("/").slice(1, -1)
    for (let i = 1; i <= segments.length; i++) {
      const layout = `/${segments.slice(0, i).join("/")}/layout`
      for (const file of pages[layout] ?? []) if (file.endsWith(".js")) chunks.add(file)
    }
    const bytes = [...chunks].reduce((sum, file) => sum + gzipSize(file), 0)
    const budgetKb = budgets.routes?.[route] ?? budgets.defaultKb
    return { route, bytes, budgetKb, over: bytes / 1024 > budgetKb }
  })
  .sort((a, b) => b.bytes - a.bytes)

let baseline = null
if (typeof flags.baseline === "string") {
  baseline = new Map(readJson(flags.baseline).rows.map((r) => [r.route, r.bytes]))
}

printTable(
  ["Ruta", "JS gzip", "Presupuesto", baseline ? "Diferencia" : "", "Estado"].filter(Boolean),
  rows.map((r) => {
    const delta = baseline?.has(r.route) ? r.bytes - baseline.get(r.route) : null
    const cells = [r.route.replace(/\/page$/, "") || "/", fmtKb(r.bytes), `${r.budgetKb} KB`]
    if (baseline) cells.push(delta == null ? "nueva" : `${delta >= 0 ? "+" : ""}${fmtKb(delta)}`)
    cells.push(r.over ? "SE PASA" : "ok")
    return cells
  })
)

const file = saveResult("bundle", { at: new Date().toISOString(), rows })
const over = rows.filter((r) => r.over)
console.log(`\n${over.length} de ${rows.length} rutas pasan su presupuesto. Guardado en ${path.relative(process.cwd(), file)}`)
if (flags.check && over.length > 0) process.exit(1)
