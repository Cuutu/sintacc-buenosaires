import dns from "dns/promises"
import { isIP } from "net"

const FETCH_TIMEOUT_MS = 8000
const MAX_BYTES = 500_000
const MAX_TEXT_CHARS = 6000

function isPrivateIp(ip: string): boolean {
  if (ip === "127.0.0.1" || ip === "::1") return true
  if (ip.startsWith("10.") || ip.startsWith("192.168.")) return true
  if (ip.startsWith("172.")) {
    const second = Number(ip.split(".")[1])
    if (second >= 16 && second <= 31) return true
  }
  if (ip.startsWith("169.254.")) return true
  if (ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80")) return true
  return false
}

export function isSafePublicUrl(raw: string): URL | null {
  try {
    const url = new URL(raw)
    if (url.protocol !== "http:" && url.protocol !== "https:") return null
    if (url.username || url.password) return null
    const host = url.hostname.toLowerCase()
    if (host === "localhost" || host.endsWith(".local")) return null
    if (isIP(host) && isPrivateIp(host)) return null
    return url
  } catch {
    return null
  }
}

async function hostResolvesToPrivate(hostname: string): Promise<boolean> {
  if (isIP(hostname)) return isPrivateIp(hostname)
  try {
    const records = await dns.lookup(hostname, { all: true })
    return records.some((r) => isPrivateIp(r.address))
  } catch {
    return true
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export async function fetchWebsiteText(url: string): Promise<string | null> {
  const safe = isSafePublicUrl(url)
  if (!safe) return null
  if (await hostResolvesToPrivate(safe.hostname)) return null

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    let current = safe
    for (let i = 0; i < 3; i++) {
      const res = await fetch(current.toString(), {
        signal: controller.signal,
        redirect: "manual",
        headers: {
          "User-Agent": "CelimapResearchBot/1.0 (+https://celimap.com.ar)",
          Accept: "text/html,application/xhtml+xml",
        },
      })

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location")
        if (!location) return null
        const next = isSafePublicUrl(new URL(location, current).toString())
        if (!next || (await hostResolvesToPrivate(next.hostname))) return null
        current = next
        continue
      }

      if (!res.ok) return null

      const contentType = res.headers.get("content-type") ?? ""
      if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
        return null
      }

      const buf = Buffer.from(await res.arrayBuffer())
      if (buf.length > MAX_BYTES) return null

      const text = stripHtml(buf.toString("utf-8"))
      return text.slice(0, MAX_TEXT_CHARS)
    }
    return null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchWebsitePaths(baseUrl: string): Promise<string[]> {
  const texts: string[] = []
  const safe = isSafePublicUrl(baseUrl)
  if (!safe) return texts

  const home = await fetchWebsiteText(safe.toString())
  if (home) texts.push(`[homepage]\n${home}`)

  for (const path of ["/menu", "/carta", "/carta-menu", "/nosotros"]) {
    const pageUrl = new URL(path, safe).toString()
    const text = await fetchWebsiteText(pageUrl)
    if (text && text !== home) {
      texts.push(`[${path}]\n${text}`)
    }
  }

  return texts
}
