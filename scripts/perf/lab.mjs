#!/usr/bin/env node
// Lighthouse mobile (como PageSpeed): 3 corridas por URL y la mediana.
//
//   npm run perf:lab                              contra producción
//   npm run perf:lab -- https://prueba.celimap.com.ar
//   npm run perf:lab -- --runs 5 --only /mapa
//   npm run perf:lab -- --chrome=--no-sandbox      (flags extra para Chrome, p. ej. en Linux como root)
//
// Necesita Google Chrome instalado. La primera vez baja Lighthouse con npx (no
// queda en package.json). Usa la misma emulación que PageSpeed: Moto G Power y
// 4G lenta simulada, así que los números se comparan con los de pagespeed.web.dev.
import { spawn } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { DEFAULT_PAGES, fmtMs, median, normalizeBaseUrl, parseArgs, printTable, saveResult } from "./_util.mjs"

const LIGHTHOUSE = "lighthouse@13.5.0"

const { flags, positional } = parseArgs()
const base = normalizeBaseUrl(positional[0])
const runs = Number(flags.runs) > 0 ? Number(flags.runs) : 3
const pages = typeof flags.only === "string" ? flags.only.split(",") : DEFAULT_PAGES
const chromeFlags = ["--headless=new", ...(typeof flags.chrome === "string" ? flags.chrome.split(/\s+/) : [])]
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "celimap-lh-"))

function quoteForCmd(arg) {
  return /[\s"&|<>^]/.test(arg) ? `"${arg.replace(/"/g, '\\"')}"` : arg
}

function runLighthouse(url, outFile) {
  return new Promise((resolve, reject) => {
    const args = [
      "--yes",
      LIGHTHOUSE,
      url,
      "--output=json",
      `--output-path=${outFile}`,
      "--only-categories=performance",
      "--quiet",
      `--chrome-flags=${chromeFlags.join(" ")}`,
    ]
    const options = { stdio: ["ignore", "ignore", "pipe"] }
    // En Windows `npx` es npx.cmd y necesita shell. Se arma la línea entera ya
    // citada: pasar la lista de args con shell: true da el aviso DEP0190 y corta
    // en dos los flags que tienen espacios.
    const child =
      process.platform === "win32"
        ? spawn(["npx", ...args].map(quoteForCmd).join(" "), { ...options, shell: true })
        : spawn("npx", args, options)
    let stderr = ""
    child.stderr.on("data", (chunk) => (stderr += chunk))
    child.on("error", reject)
    child.on("close", (code) => {
      if (code === 0) return resolve()
      const lines = stderr.trim().split("\n").map((l) => l.trim()).filter(Boolean)
      const reason = lines.find((l) => /error/i.test(l) && !l.startsWith("at ")) ?? lines[0] ?? `código ${code}`
      reject(new Error(reason))
    })
  })
}

function readMetrics(file) {
  const lhr = JSON.parse(fs.readFileSync(file, "utf8"))
  const audit = (id) => lhr.audits?.[id]?.numericValue ?? null
  return {
    score: Math.round((lhr.categories?.performance?.score ?? 0) * 100),
    fcp: audit("first-contentful-paint"),
    lcp: audit("largest-contentful-paint"),
    tbt: audit("total-blocking-time"),
    cls: audit("cumulative-layout-shift"),
    si: audit("speed-index"),
    bytes: audit("total-byte-weight"),
  }
}

const results = []
for (const page of pages) {
  const url = `${base}${page}`
  const samples = []
  process.stdout.write(`${page} `)
  for (let i = 0; i < runs; i++) {
    process.stdout.write(".")
    const out = path.join(tmp, `run-${results.length}-${i}.json`)
    try {
      await runLighthouse(url, out)
      samples.push(readMetrics(out))
    } catch (error) {
      process.stdout.write("x")
      console.error(`\n  falló ${url}: ${error.message}`)
    }
  }
  process.stdout.write("\n")
  const pick = (key) => median(samples.map((s) => s[key]))
  results.push({
    page,
    runs: samples.length,
    score: pick("score"),
    fcp: pick("fcp"),
    lcp: pick("lcp"),
    tbt: pick("tbt"),
    cls: pick("cls"),
    si: pick("si"),
    bytes: pick("bytes"),
    samples,
  })
}
console.log(`\nLighthouse ${LIGHTHOUSE.split("@")[1]} mobile · ${base} · mediana de ${runs}\n`)
printTable(
  ["Página", "Puntaje", "FCP", "LCP", "TBT", "CLS", "Speed Index", "Peso"],
  results.map((r) => [
    r.page,
    r.score,
    fmtMs(r.fcp),
    fmtMs(r.lcp),
    fmtMs(r.tbt),
    r.cls == null ? null : r.cls.toFixed(3),
    fmtMs(r.si),
    r.bytes == null ? null : `${Math.round(r.bytes / 1024)} KB`,
  ])
)

const file = saveResult("lab", { at: new Date().toISOString(), base, runs, lighthouse: LIGHTHOUSE, results })
fs.rmSync(tmp, { recursive: true, force: true })
console.log(`\nGuardado en ${file}`)
