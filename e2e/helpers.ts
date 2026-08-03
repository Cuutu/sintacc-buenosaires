import type { Page, Request, Response, Route } from "@playwright/test"
import {
  E2E_CSRF,
  E2E_FAVORITES_EMPTY,
  E2E_LISTS_EMPTY,
  E2E_PLACES_LIST,
  E2E_PROVIDERS,
  E2E_SESSION_UNAUTH,
  E2E_STATS,
  assertFavoritesContract,
  assertListsContract,
  assertPlacesListContract,
  assertStatsContract,
} from "./fixtures/payloads"

/**
 * Nivel E2E:
 * - hermetic: local/fixtures mock 200, sin Mongo, secret de test
 * - staging: pendiente URL autorizada (no prod mutable)
 */

/** Overflow legítimo — SOLO estos marcadores data-overflow-allowed. */
export const ALLOWED_OVERFLOW_MARKERS = [
  "stats-carousel",
  "map-chips",
  "mapbox-canvas",
  "featured-carousel",
  "decoration",
] as const

export type OverflowHit = {
  selector: string
  overflowPx: number
  side: "left" | "right"
}

export type DocumentOverflowResult = {
  scrollWidth: number
  clientWidth: number
  overflowPx: number
  ok: boolean
}

export const MOBILE_VIEWPORTS = [
  { name: "320", width: 320, height: 568 },
  { name: "360", width: 360, height: 640 },
  { name: "375", width: 375, height: 667 },
  { name: "390", width: 390, height: 844 },
  { name: "414", width: 414, height: 896 },
  { name: "430", width: 430, height: 932 },
] as const

export const CRITICAL_OVERFLOW_VIEWPORTS = [
  { name: "320", width: 320, height: 568 },
  { name: "390", width: 390, height: 844 },
  { name: "430", width: 430, height: 932 },
] as const

export const TABLET_VIEWPORT = { name: "tablet", width: 768, height: 1024 } as const
export const DESKTOP_VIEWPORT = { name: "desktop", width: 1280, height: 800 } as const

const DOC_OVERFLOW_TOLERANCE_PX = 1

export type PageErrorRecord = {
  message: string
  stack?: string
  name?: string
}

export type NetworkFailure = {
  url: string
  method: string
  status?: number
  failure?: string
  resourceType?: string
  isRscPrefetch: boolean
}

export type MapboxLifecycleStats = {
  inits: number
  destroys: number
  active: number
  peakActive: number
}

export function attachPageErrorGuards(page: Page): {
  pageErrors: PageErrorRecord[]
  consoleErrors: string[]
  networkFailures: NetworkFailure[]
  responses500: NetworkFailure[]
} {
  const pageErrors: PageErrorRecord[] = []
  const consoleErrors: string[] = []
  const networkFailures: NetworkFailure[] = []
  const responses500: NetworkFailure[] = []

  page.on("pageerror", (err) => {
    pageErrors.push({
      message: err.message,
      stack: err.stack,
      name: err.name,
    })
  })

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text())
    }
  })

  page.on("requestfailed", (req: Request) => {
    const url = req.url()
    networkFailures.push({
      url,
      method: req.method(),
      failure: req.failure()?.errorText,
      resourceType: req.resourceType(),
      isRscPrefetch: isRscOrPrefetch(req),
    })
  })

  page.on("response", (res: Response) => {
    if (res.status() >= 500) {
      const req = res.request()
      responses500.push({
        url: res.url(),
        method: req.method(),
        status: res.status(),
        resourceType: req.resourceType(),
        isRscPrefetch: isRscOrPrefetch(req),
      })
    }
  })

  return { pageErrors, consoleErrors, networkFailures, responses500 }
}

export function isRscOrPrefetch(req: Request): boolean {
  const url = req.url()
  const headers = req.headers()
  return (
    url.includes("_rsc=") ||
    headers["next-router-prefetch"] === "1" ||
    headers["purpose"] === "prefetch" ||
    headers["sec-purpose"] === "prefetch"
  )
}

export function pathFromUrl(url: string): string {
  try {
    return new URL(url).pathname
  } catch {
    return url
  }
}

/** Abort explícito de insights — no es 500 allowlisted. */
export function isVercelInsightsPath(url: string): boolean {
  const path = pathFromUrl(url)
  return path.startsWith("/_vercel/insights")
}

/**
 * Fingerprint exacto WebKit local: cancelación de request hacia 127.0.0.1
 */
export const WEBKIT_LOCAL_ACCESS_CONTROL_CANCEL_RE =
  /^\/127\.0\.0\.1:\d+\/\S+ due to access control checks\.?$/

export function isAllowedWebKitLocalRscCancel(
  record: PageErrorRecord,
  opts: { baseHost: string; counted: string[] }
): boolean {
  const msg = record.message.trim()
  if (!WEBKIT_LOCAL_ACCESS_CONTROL_CANCEL_RE.test(msg)) return false
  if (!/^127\.0\.0\.1(:\d+)?$/.test(opts.baseHost) && !opts.baseHost.startsWith("127.0.0.1:")) {
    return false
  }
  opts.counted.push(msg)
  return true
}

/** @deprecated alias — fingerprint unificado */
export const WEBKIT_LOCAL_RSC_CANCEL_RE = WEBKIT_LOCAL_ACCESS_CONTROL_CANCEL_RE

export async function assertNoAppCrash(page: Page): Promise<void> {
  const body = await page.locator("body").innerText()
  if (/Application error:\s*a client-side exception has occurred/i.test(body)) {
    throw new Error("Pantalla Application error detectada")
  }
  if (/Celimap tuvo un problema/i.test(body)) {
    throw new Error('Pantalla global-error "Celimap tuvo un problema" detectada')
  }
  if (/Algo falló en esta pantalla/i.test(body)) {
    throw new Error("AppErrorBoundary visible (no esperado en happy-path)")
  }
}

/** Clicks reales BottomNav (no page.goto). */
export async function clickBottomNav(
  page: Page,
  slot: "home-map" | "favoritos" | "sugerir" | "explorar" | "perfil",
  opts: { settleMs?: number } = {}
): Promise<void> {
  const nav = page.getByTestId("bottom-nav")
  await expectVisibleNav(nav)
  const target = nav.locator(`[data-nav-slot="${slot}"]`).first()
  await target.click({ timeout: 10_000 })
  const settleMs = opts.settleMs ?? 0
  if (settleMs > 0) await page.waitForTimeout(settleMs)
}

/** Cadencia humana entre tabs (~0.7–1.1s). */
export const HUMAN_TAB_SETTLE_MS = 850

export async function assertNoRedirectLoop(
  page: Page,
  sampleMs = 2500,
  maxUnique = 6
): Promise<void> {
  const seen: string[] = []
  const start = Date.now()
  while (Date.now() - start < sampleMs) {
    const path = new URL(page.url()).pathname
    seen.push(path)
    await page.waitForTimeout(200)
  }
  const unique = new Set(seen)
  // Alternancia rápida A↔B muchas veces
  let flips = 0
  for (let i = 1; i < seen.length; i++) {
    if (seen[i] !== seen[i - 1]) flips += 1
  }
  if (flips > maxUnique && unique.size <= 2) {
    throw new Error(`Redirect loop sospechoso: flips=${flips} paths=${[...unique].join(",")}`)
  }
}

export async function readChunkReloadKeys(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i)
      if (k && k.startsWith("celimap_chunk_reload_v1:")) out.push(k)
    }
    return out
  })
}

/** Habilita contadores __celimapDiag (next start = production; hace falta flag). */
export async function enableCelimapDiag(page: Page): Promise<void> {
  await page.addInitScript(() => {
    ;(window as Window & { __CELIMAP_DIAG__?: boolean }).__CELIMAP_DIAG__ = true
  })
}

export async function readCelimapDiag(page: Page): Promise<{
  layoutChromeMounts: number
  clientErrorListenerMounts: number
  listenerAttachCycles: number
} | null> {
  return page.evaluate(() => {
    return (
      (window as Window & { __celimapDiag?: {
        layoutChromeMounts: number
        clientErrorListenerMounts: number
        listenerAttachCycles: number
      } }).__celimapDiag ?? null
    )
  })
}

export async function countReloadsViaPerformance(page: Page): Promise<number> {
  return page.evaluate(() => {
    const navs = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[]
    return navs.length || 1
  })
}

async function expectVisibleNav(nav: ReturnType<Page["getByTestId"]>): Promise<void> {
  await nav.waitFor({ state: "visible", timeout: 12_000 })
}

export async function assertSingleChrome(page: Page): Promise<void> {
  const counts = await page.evaluate(() => ({
    bottomNavs: document.querySelectorAll('[data-testid="bottom-nav"]').length,
    sectionBoundaries: document.querySelectorAll('[data-error-boundary="section"]').length,
    mapCanvases: document.querySelectorAll(
      "canvas.mapboxgl-canvas, canvas[data-e2e-mapbox-adapter]"
    ).length,
  }))
  if (counts.bottomNavs > 1) {
    throw new Error(`BottomNav duplicado: ${counts.bottomNavs}`)
  }
  if (counts.sectionBoundaries > 1) {
    // 0 ok (sin error); >1 = múltiples UIs de error montadas
    throw new Error(`Error boundaries UI acumulados: ${counts.sectionBoundaries}`)
  }
  if (counts.mapCanvases > 1) {
    throw new Error(`Mapa canvas acumulados: ${counts.mapCanvases}`)
  }
}

export async function attachUnhandledRejectionGuard(page: Page): Promise<string[]> {
  const rejections: string[] = []
  await page.addInitScript(() => {
    window.addEventListener("unhandledrejection", (e) => {
      const w = window as Window & { __celimapRej?: string[] }
      w.__celimapRej = w.__celimapRej || []
      const r = e.reason
      w.__celimapRej.push(String(r && ((r as Error).stack || (r as Error).message || r)))
    })
  })
  page.on("load", async () => {
    const batch = await page.evaluate(() => {
      const w = window as Window & { __celimapRej?: string[] }
      const out = w.__celimapRej || []
      w.__celimapRej = []
      return out
    })
    rejections.push(...batch)
  })
  return rejections
}

export async function drainUnhandledRejections(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const w = window as Window & { __celimapRej?: string[] }
    const out = w.__celimapRej || []
    w.__celimapRej = []
    return out
  })
}

export async function assertBodyHasVisibleContent(page: Page): Promise<void> {
  const visible = await page.evaluate(() => {
    const body = document.body
    if (!body) return false
    const text = (body.innerText || "").replace(/\s+/g, " ").trim()
    if (text.length > 20) return true
    if (body.querySelector("[data-auth-state], .animate-pulse, main")) return true
    return false
  })
  if (!visible) throw new Error("Body sin contenido visible suficiente")
}

/** A) Overflow del documento — sin excepciones. */
export async function assertDocumentNoHorizontalScroll(
  page: Page,
  tolerance = DOC_OVERFLOW_TOLERANCE_PX
): Promise<DocumentOverflowResult> {
  const result = await page.evaluate((tol) => {
    const el = document.documentElement
    const overflowPx = el.scrollWidth - el.clientWidth
    return {
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      overflowPx,
      ok: overflowPx <= tol,
    }
  }, tolerance)
  if (!result.ok) {
    throw new Error(
      `Document scrollWidth overflow: scrollWidth=${result.scrollWidth} clientWidth=${result.clientWidth} (+${result.overflowPx}px)`
    )
  }
  return result
}

/**
 * B) Bounding boxes fuera del viewport.
 * Ignora SOLO ancestros con data-overflow-allowed en ALLOWED_OVERFLOW_MARKERS.
 */
export async function findAccidentalHorizontalOverflow(page: Page): Promise<OverflowHit[]> {
  return page.evaluate((allowed) => {
    const vw = window.innerWidth
    const eps = 1
    const hits: { selector: string; overflowPx: number; side: "left" | "right" }[] = []

    function isAllowedMarker(el: Element): boolean {
      let cur: Element | null = el
      while (cur) {
        const marker = cur.getAttribute("data-overflow-allowed")
        if (marker && (allowed as string[]).includes(marker)) return true
        cur = cur.parentElement
      }
      return false
    }

    function cssPath(el: Element): string {
      if (el.id) return `#${el.id}`
      const tag = el.tagName.toLowerCase()
      const cls = (el.getAttribute("class") || "")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .join(".")
      return cls ? `${tag}.${cls}` : tag
    }

    const all = Array.from(document.body.querySelectorAll("*"))
    for (const el of all) {
      if (!(el instanceof HTMLElement)) continue
      const style = window.getComputedStyle(el)
      if (style.display === "none" || style.visibility === "hidden") continue
      if (style.opacity === "0") continue

      const rect = el.getBoundingClientRect()
      if (rect.width < 2 || rect.height < 2) continue
      if (isAllowedMarker(el)) continue

      if (rect.left < -eps) {
        hits.push({
          selector: cssPath(el),
          overflowPx: Math.round(-rect.left),
          side: "left",
        })
      }
      if (rect.right > vw + eps) {
        hits.push({
          selector: cssPath(el),
          overflowPx: Math.round(rect.right - vw),
          side: "right",
        })
      }
    }

    const map = new Map<string, OverflowHit>()
    for (const h of hits) {
      const key = `${h.selector}|${h.side}`
      const prev = map.get(key)
      if (!prev || h.overflowPx > prev.overflowPx) map.set(key, h)
    }
    return Array.from(map.values()).sort((a, b) => b.overflowPx - a.overflowPx)
  }, [...ALLOWED_OVERFLOW_MARKERS])
}

export async function assertNoAccidentalOverflow(page: Page, routeLabel: string): Promise<void> {
  await assertDocumentNoHorizontalScroll(page)
  const hits = await findAccidentalHorizontalOverflow(page)
  if (hits.length > 0) {
    const detail = hits
      .slice(0, 8)
      .map((o) => `${o.selector} ${o.side}+${o.overflowPx}px`)
      .join("; ")
    throw new Error(`Overflow bounding-box en ${routeLabel}: ${detail}`)
  }
}

/**
 * Happy-path: CERO 500 permitidos.
 * Abort de `/_vercel/insights` y cancel RSC/prefetch no cuentan como fallo.
 */
export function assertHappyPathNetwork(
  responses500: NetworkFailure[],
  networkFailures: NetworkFailure[]
): void {
  if (responses500.length) {
    throw new Error(
      `HTTP 500 en happy-path (prohibidos): ${responses500
        .map((r) => `${r.status} ${r.method} ${r.url}`)
        .join(" | ")}`
    )
  }
  const unexpectedFail = networkFailures.filter((r) => {
    if (isVercelInsightsPath(r.url)) return false
    if (r.isRscPrefetch) return false
    // E2E abort intencional de SW (tests herméticos)
    if (/\/sw\.js(\?|$)/.test(r.url)) return false
    const fail = (r.failure || "").toLowerCase()
    if (fail.includes("abort") || fail.includes("cancel") || fail.includes("ns_binding_aborted")) {
      return false
    }
    // WebKit: "Blocked by Web Inspector" cuando route.abort(sw.js)
    if (fail.includes("blocked by web inspector") && /\/sw\.js(\?|$)/.test(r.url)) return false
    return true
  })
  if (unexpectedFail.length) {
    throw new Error(
      `Requests fallidas en happy-path: ${unexpectedFail
        .slice(0, 6)
        .map((r) => `${r.method} ${r.url} (${r.failure || "?"})`)
        .join(" | ")}`
    )
  }
}

/** @deprecated usar assertHappyPathNetwork — sin allowlist 500 */
export const assertHermeticNetwork = assertHappyPathNetwork

export function assertPageErrorsClean(
  pageErrors: PageErrorRecord[],
  opts: { baseHost: string; webkitRscCancels: string[] }
): void {
  const bad = pageErrors.filter(
    (e) => !isAllowedWebKitLocalRscCancel(e, { baseHost: opts.baseHost, counted: opts.webkitRscCancels })
  )
  if (bad.length) {
    throw new Error(`pageerror: ${bad.map((e) => e.message).join(" | ")}`)
  }
}

async function fulfillJson(route: Route, status: number, body: unknown): Promise<void> {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  })
}

export type HappyPathMockOptions = {
  /** Sesión NextAuth; default unauth null */
  session?: unknown
  sessionStatus?: number
  delaySessionMs?: number
}

/**
 * Mocks deterministas 200 para happy-path.
 * Insights: abort explícito (no 500).
 * Onboarding: localStorage seeded para no tapar mapa.
 */
export async function installHappyPathMocks(
  page: Page,
  opts: HappyPathMockOptions = {}
): Promise<void> {
  const sessionBody = opts.session === undefined ? E2E_SESSION_UNAUTH : opts.session
  const sessionStatus = opts.sessionStatus ?? 200
  const delaySessionMs = opts.delaySessionMs ?? 0

  await page.addInitScript(() => {
    try {
      localStorage.setItem("celimap_onboarded", "1")
    } catch {
      /* ignore */
    }
  })

  await page.route("**/_vercel/insights/**", async (route) => {
    await route.abort("blockedbyclient")
  })

  await page.route("**/api/stats**", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue()
      return
    }
    assertStatsContract(E2E_STATS)
    await fulfillJson(route, 200, E2E_STATS)
  })

  await page.route("**/api/places**", async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname
    if (route.request().method() !== "GET") {
      await route.continue()
      return
    }
    if (path === "/api/places" || path === "/api/places/") {
      assertPlacesListContract(E2E_PLACES_LIST)
      await fulfillJson(route, 200, E2E_PLACES_LIST)
      return
    }
    if (path.startsWith("/api/places/")) {
      await fulfillJson(route, 200, E2E_PLACES_LIST.places[0])
      return
    }
    await fulfillJson(route, 200, E2E_PLACES_LIST)
  })

  await page.route("**/api/lists**", async (route) => {
    if (route.request().method() !== "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
      return
    }
    assertListsContract(E2E_LISTS_EMPTY)
    await fulfillJson(route, 200, E2E_LISTS_EMPTY)
  })

  await page.route("**/api/favorites**", async (route) => {
    if (route.request().method() !== "GET") {
      await fulfillJson(route, 200, { ok: true })
      return
    }
    assertFavoritesContract(E2E_FAVORITES_EMPTY)
    await fulfillJson(route, 200, E2E_FAVORITES_EMPTY)
  })

  await page.route("**/api/auth/**", async (route) => {
    const path = pathFromUrl(route.request().url())
    const method = route.request().method()

    if (path === "/api/auth/session" || path.endsWith("/api/auth/session")) {
      if (delaySessionMs > 0) await new Promise((r) => setTimeout(r, delaySessionMs))
      await fulfillJson(route, sessionStatus, sessionBody)
      return
    }
    if (path.includes("/api/auth/csrf")) {
      await fulfillJson(route, 200, E2E_CSRF)
      return
    }
    if (path.includes("/api/auth/providers")) {
      await fulfillJson(route, 200, E2E_PROVIDERS)
      return
    }
    if (path.includes("/api/auth/_log")) {
      await fulfillJson(route, 200, {})
      return
    }
    if (method === "GET" || method === "POST") {
      await fulfillJson(route, 200, {})
      return
    }
    await route.continue()
  })
}

/** Flags E2E Mapbox: stats + adapter mock (no WebGL real). */
export async function installMapboxE2eAdapter(page: Page): Promise<void> {
  await page.addInitScript(() => {
    ;(window as Window & {
      __CELIMAP_E2E_MAPBOX_STATS__?: boolean
      __CELIMAP_E2E_MOCK_MAPBOX__?: boolean
    }).__CELIMAP_E2E_MAPBOX_STATS__ = true
    ;(window as Window & {
      __CELIMAP_E2E_MOCK_MAPBOX__?: boolean
    }).__CELIMAP_E2E_MOCK_MAPBOX__ = true
  })
}

export async function installMapboxForceInitError(page: Page): Promise<void> {
  await page.addInitScript(() => {
    ;(window as Window & {
      __CELIMAP_E2E_FORCE_MAP_INIT_ERROR__?: boolean
      __CELIMAP_E2E_MAPBOX_STATS__?: boolean
    }).__CELIMAP_E2E_FORCE_MAP_INIT_ERROR__ = true
    ;(window as Window & { __CELIMAP_E2E_MAPBOX_STATS__?: boolean }).__CELIMAP_E2E_MAPBOX_STATS__ =
      true
  })
}

export async function readMapboxLifecycleStats(page: Page): Promise<MapboxLifecycleStats | null> {
  return page.evaluate(() => {
    const w = window as Window & { __celimapMapboxStats?: MapboxLifecycleStats }
    return w.__celimapMapboxStats ?? null
  })
}

export async function countMapCanvases(page: Page): Promise<number> {
  return page.locator("canvas.mapboxgl-canvas, canvas[data-e2e-mapbox-adapter]").count()
}

export async function waitForMapAdapterOrFallback(page: Page, timeout = 15_000): Promise<"mock" | "fallback" | "none"> {
  const mock = page.locator('canvas[data-e2e-mapbox-adapter="mock"]')
  const fallback = page.getByText(/No pudimos cargar el mapa|Mapa no configurado/i)
  try {
    await Promise.race([
      mock.first().waitFor({ state: "visible", timeout }),
      fallback.first().waitFor({ state: "visible", timeout }),
    ])
  } catch {
    return "none"
  }
  if ((await mock.count()) > 0) return "mock"
  if ((await fallback.count()) > 0) return "fallback"
  return "none"
}

/** Nav SPA: salir de /mapa sin full reload (preserva __celimapMapboxStats). */
export async function softLeaveMapa(page: Page): Promise<void> {
  const home = page.locator('nav a[href="/"]').first()
  if ((await home.count()) > 0) {
    await home.click()
  } else {
    await page.locator('a[href="/sugerir"]').first().click()
  }
  await page.waitForURL((url) => !url.pathname.startsWith("/mapa"), { timeout: 10_000 })
  await page.waitForTimeout(200)
}

export async function softEnterMapa(page: Page): Promise<void> {
  await page.locator('nav a[href="/mapa"]').first().click()
  await page.waitForURL(/\/mapa/, { timeout: 10_000 })
}
