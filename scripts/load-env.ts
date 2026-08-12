import dns from "dns"
import { existsSync, readFileSync } from "fs"
import { resolve } from "path"

/**
 * Carga .env.local / .env para scripts `tsx`.
 * Next.js los inyecta solo; `npx tsx scripts/...` no.
 * No imprime valores. No pisa vars ya definidas en el shell.
 *
 * También fuerza DNS públicos: en Windows, Node a veces hace
 * querySrv ECONNREFUSED contra el DNS del router (192.168.x.1)
 * aunque nslookup sí resuelva. Mismo patrón que scripts/kml-*.ts.
 */
export function loadEnvFiles(): void {
  try {
    dns.setServers(["8.8.8.8", "1.1.1.1"])
    dns.setDefaultResultOrder("ipv4first")
  } catch {
    // ignore si el runtime no permite setServers
  }

  for (const file of [".env.local", ".env"]) {
    const full = resolve(process.cwd(), file)
    if (!existsSync(full)) continue
    const raw = readFileSync(full, "utf8")
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const eq = trimmed.indexOf("=")
      if (eq <= 0) continue
      const key = trimmed.slice(0, eq).trim()
      let value = trimmed.slice(eq + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      if (process.env[key] === undefined) process.env[key] = value
    }
  }
}
