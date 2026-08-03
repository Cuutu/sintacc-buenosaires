/**
 * Diagnóstico WebKit "access control checks" — @hermetic
 * Ejecutar serial: npx playwright test e2e/webkit-rsc-diag.spec.ts --project=webkit --workers=1
 */
import { test } from "@playwright/test"
import { attachPageErrorGuards, WEBKIT_LOCAL_RSC_CANCEL_RE } from "./helpers"
import * as fs from "fs"
import * as path from "path"

test.describe.configure({ mode: "serial" })

test.describe("webkit RSC access-control diag @hermetic", () => {
  test("captura pageerrors al navegar home→mapa→favoritos serial", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "webkit", "Solo WebKit")

    const guards = attachPageErrorGuards(page)
    const report: Record<string, unknown>[] = []

    page.on("request", (req) => {
      if (req.url().includes("_rsc=") || req.headers()["next-router-prefetch"]) {
        report.push({
          t: "request",
          url: req.url(),
          method: req.method(),
          resourceType: req.resourceType(),
          prefetchHeader: req.headers()["next-router-prefetch"] || null,
          purpose: req.headers()["purpose"] || req.headers()["sec-purpose"] || null,
        })
      }
    })

    await page.setViewportSize({ width: 360, height: 640 })
    for (const pathName of ["/", "/mapa", "/favoritos", "/login", "/sugerir"]) {
      await page.goto(pathName, { waitUntil: "domcontentloaded" })
      await page.waitForTimeout(800)
    }

    // Prefetch diagnóstico: click BottomNav links (dispara RSC)
    await page.goto("/", { waitUntil: "domcontentloaded" })
    const nav = page.getByRole("navigation", { name: /Navegacion principal/i })
    if (await nav.count()) {
      const links = nav.locator("a")
      const n = await links.count()
      for (let i = 0; i < Math.min(n, 4); i++) {
        await links.nth(i).hover().catch(() => null)
        await page.waitForTimeout(200)
      }
    }

    const analysis = {
      pageErrors: guards.pageErrors,
      networkFailures: guards.networkFailures,
      responses500: guards.responses500,
      rscRequests: report,
      matchesExactFingerprint: guards.pageErrors.filter((e) =>
        WEBKIT_LOCAL_RSC_CANCEL_RE.test(e.message.trim())
      ),
      otherPageErrors: guards.pageErrors.filter(
        (e) => !WEBKIT_LOCAL_RSC_CANCEL_RE.test(e.message.trim())
      ),
      notes: [
        "Corrida serial workers=1 contra next start (prod build)",
        "Fingerprint permitido solo: /^\\/127.0.0.1:\\d+\\/...\\?_rsc=... due to access control checks.$/",
        "WebKit Playwright ≠ WKWebView iOS",
      ],
    }

    const outDir = path.join("docs", "baselines", "lote3")
    fs.mkdirSync(outDir, { recursive: true })
    fs.writeFileSync(
      path.join(outDir, "webkit-rsc-investigation.json"),
      JSON.stringify(analysis, null, 2),
      "utf8"
    )

    // No fallar la suite crítica por cancels fingerprint; sí fallar si hay otros
    if (analysis.otherPageErrors.length) {
      throw new Error(
        `WebKit pageerrors no fingerprint: ${analysis.otherPageErrors.map((e) => e.message).join(" | ")}`
      )
    }
  })
})
