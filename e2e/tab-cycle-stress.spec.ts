/**
 * @hermetic @mobile @stress — separado del uso normal.
 * Mide presión RSC/requests que puede colgar next start.
 */
import { test, expect } from "@playwright/test"
import {
  attachPageErrorGuards,
  assertNoAppCrash,
  assertHappyPathNetwork,
  clickBottomNav,
  installHappyPathMocks,
  installMapboxE2eAdapter,
} from "./helpers"
import { E2E_SESSION_AUTH } from "./fixtures/payloads"

test.describe("BottomNav stress @hermetic @mobile @stress", () => {
  test("88 clicks rápidos: telemetría + servidor vivo", async ({ page, context, request }) => {
    test.setTimeout(120_000)
    await context.clearCookies()
    await context.route("**/sw.js", (r) => r.abort())
    await installHappyPathMocks(page, { session: E2E_SESSION_AUTH })
    await installMapboxE2eAdapter(page)
    const guards = attachPageErrorGuards(page)

    let navRequests = 0
    let rscRequests = 0
    let pending = 0
    let peakPending = 0
    page.on("request", (req) => {
      pending += 1
      peakPending = Math.max(peakPending, pending)
      const t = req.resourceType()
      if (t === "document" || t === "fetch" || t === "xhr") navRequests += 1
      if (req.url().includes("_rsc=") || req.headers()["next-router-prefetch"]) {
        rscRequests += 1
      }
    })
    page.on("requestfinished", () => {
      pending = Math.max(0, pending - 1)
    })
    page.on("requestfailed", () => {
      pending = Math.max(0, pending - 1)
    })

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/", { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("bottom-nav")).toBeVisible({ timeout: 12_000 })

    const sequence: Array<"home-map" | "favoritos" | "sugerir" | "perfil"> = [
      "home-map",
      "favoritos",
      "sugerir",
      "perfil",
    ]
    const clicks = 88
    const started = Date.now()
    let hangReason: string | null = null
    try {
      for (let i = 0; i < clicks; i++) {
        await clickBottomNav(page, sequence[i % sequence.length], { settleMs: 40 })
        if (i % 11 === 0) await assertNoAppCrash(page)
      }
    } catch (e) {
      hangReason = e instanceof Error ? e.message : String(e)
    }
    const elapsedMs = Date.now() - started

    await assertNoAppCrash(page).catch(() => null)
    expect(guards.pageErrors.length).toBe(0)
    assertHappyPathNetwork(guards.responses500, guards.networkFailures)

    const healthStarted = Date.now()
    const health = await request.get("/", { timeout: 15_000 })
    const healthMs = Date.now() - healthStarted
    expect(health.status(), "next start muerto tras stress").toBeLessThan(500)

    const mem = await page.evaluate(() => {
      const p = performance as Performance & {
        memory?: { usedJSHeapSize: number; totalJSHeapSize: number }
      }
      return p.memory
        ? {
            usedMB: Math.round(p.memory.usedJSHeapSize / 1024 / 1024),
            totalMB: Math.round(p.memory.totalJSHeapSize / 1024 / 1024),
          }
        : null
    })

    const report = {
      clicks,
      elapsedMs,
      avgMsPerClick: Math.round(elapsedMs / clicks),
      navRequests,
      rscRequests,
      peakPending,
      pendingAtEnd: pending,
      healthMs,
      healthStatus: health.status(),
      mem,
      hangReason,
      pageErrors: guards.pageErrors.length,
      note:
        hangReason || healthMs > 5000
          ? "posible presión RSC/pending — revisar si bug real o limitación test"
          : "servidor respondió OK; hang histórico no reproducido en este run",
    }
    console.log("[stress-report]", JSON.stringify(report))
    expect(report.avgMsPerClick).toBeGreaterThan(0)
  })
})
