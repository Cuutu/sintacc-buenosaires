/**
 * Auditoría read-only de una muestra del sitemap.
 *
 * Uso:
 *   npx tsx scripts/audit-sitemap-sample.ts [sitemapUrl] [sampleSize]
 *
 * Default:
 *   https://www.celimap.com.ar/sitemap.xml  40
 *
 * - No modifica DB ni archivos.
 * - No imprime PII.
 * - Exit 1 si hay fallas duras (host incorrecto, 4xx/5xx en muestra, top URLs, etc.).
 */

import { CANONICAL_ORIGIN } from "../lib/base-url"

type Finding = { url: string; issue: string }

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    redirect: "manual",
    headers: { "user-agent": "CeliMapSitemapAudit/1.0" },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`)
  return res.text()
}

function extractUrls(xml: string): string[] {
  const out: string[] = []
  const re = /<loc>([^<]+)<\/loc>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(xml))) {
    out.push(m[1].trim())
  }
  return out
}

function sample<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return [...arr]
  const step = Math.max(1, Math.floor(arr.length / n))
  const picked: T[] = []
  for (let i = 0; i < arr.length && picked.length < n; i += step) {
    picked.push(arr[i])
  }
  return picked
}

async function checkUrl(url: string): Promise<Finding[]> {
  const findings: Finding[] = []
  if (!url.startsWith(`${CANONICAL_ORIGIN}/`) && url !== CANONICAL_ORIGIN) {
    findings.push({ url, issue: "host_not_www_canonical" })
  }
  if (url.includes("/top-sin-gluten")) {
    findings.push({ url, issue: "top_url_should_not_be_in_sitemap" })
  }
  if (url.includes("/listas/privadas")) {
    findings.push({ url, issue: "private_list_in_sitemap" })
  }
  if (url.includes("?") || url.includes("&page=")) {
    findings.push({ url, issue: "query_or_pagination_in_sitemap" })
  }

  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "manual",
      headers: { "user-agent": "CeliMapSitemapAudit/1.0" },
    })
    const status = res.status
    if (status >= 300 && status < 400) {
      findings.push({ url, issue: `redirect_${status}` })
    } else if (status === 404) {
      findings.push({ url, issue: "http_404" })
    } else if (status >= 400) {
      findings.push({ url, issue: `http_${status}` })
    } else {
      const robots = res.headers.get("x-robots-tag") || ""
      if (/noindex/i.test(robots)) {
        findings.push({ url, issue: "x_robots_noindex" })
      }
      const html = await res.text()
      if (/name="robots"[^>]*content="[^"]*noindex/i.test(html)) {
        findings.push({ url, issue: "meta_robots_noindex" })
      }
      const canon = html.match(
        /rel=["']canonical["'][^>]*href=["']([^"']+)["']/i
      ) || html.match(/href=["']([^"']+)["'][^>]*rel=["']canonical["']/i)
      if (canon?.[1] && !canon[1].startsWith(CANONICAL_ORIGIN)) {
        findings.push({ url, issue: `canonical_not_www:${canon[1]}` })
      }
    }
  } catch (err) {
    findings.push({
      url,
      issue: `fetch_error:${err instanceof Error ? err.message : "unknown"}`,
    })
  }
  return findings
}

async function main() {
  const sitemapUrl =
    process.argv[2] || `${CANONICAL_ORIGIN}/sitemap.xml`
  const sampleSize = Math.max(5, Number(process.argv[3] || 40))

  console.log("audit-sitemap-sample (read-only)")
  console.log(`sitemap: ${sitemapUrl}`)
  console.log(`sample_size: ${sampleSize}`)

  const xml = await fetchText(sitemapUrl)
  const urls = extractUrls(xml)
  console.log(`total_urls: ${urls.length}`)

  const findings: Finding[] = []
  const unique = new Set(urls)
  if (unique.size !== urls.length) {
    findings.push({ url: sitemapUrl, issue: "duplicate_locs_in_sitemap" })
  }

  const nonWww = urls.filter(
    (u) => !u.startsWith(CANONICAL_ORIGIN) && u !== CANONICAL_ORIGIN
  )
  for (const u of nonWww.slice(0, 20)) {
    findings.push({ url: u, issue: "host_not_www_canonical" })
  }

  const topUrls = urls.filter((u) => u.includes("/top-sin-gluten"))
  for (const u of topUrls) {
    findings.push({ url: u, issue: "top_url_should_not_be_in_sitemap" })
  }

  if (urls.some((u) => u.endsWith("/guias") || u.includes("/guias/"))) {
    // hub vacío noindex: /guias no debe estar; guías draft tampoco
    const guias = urls.filter((u) => u.includes("/guias"))
    for (const u of guias) {
      findings.push({ url: u, issue: "guias_url_present_check_published" })
    }
  }

  const picked = sample(urls, sampleSize)
  console.log(`checking_sample: ${picked.length}`)
  for (const u of picked) {
    const f = await checkUrl(u)
    findings.push(...f)
  }

  console.log("---")
  console.log(`findings: ${findings.length}`)
  for (const f of findings.slice(0, 80)) {
    console.log(`${f.issue} | ${f.url}`)
  }
  if (findings.length > 80) console.log(`...and ${findings.length - 80} more`)

  if (findings.length > 0) {
    process.exit(1)
  }
  console.log("done_ok")
  process.exit(0)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
