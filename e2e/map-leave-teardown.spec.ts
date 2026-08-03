/**
 * @hermetic @critical — salir de /mapa no debe tirar page-boundary ni _map.off
 */
import { test, expect } from "@playwright/test"
import {
  assertNoAppCrash,
  clickBottomNav,
  installHappyPathMocks,
  installMapboxE2eAdapter,
  readMapboxLifecycleStats,
  softEnterMapa,
  softLeaveMapa,
} from "./helpers"
import { E2E_SESSION_AUTH } from "./fixtures/payloads"

test.describe("Map leave teardown @hermetic @critical", () => {
  for (const mode of ["unauth", "auth"] as const) {
    test(`${mode}: /mapa → secciones sin page-boundary ni _map.off`, async ({
      page,
      context,
    }) => {
      test.setTimeout(120_000)
      await context.clearCookies()
      await context.route("**/sw.js", (r) => r.abort())
      await installHappyPathMocks(
        page,
        mode === "auth" ? { session: E2E_SESSION_AUTH } : {}
      )
      await installMapboxE2eAdapter(page)

      const pageErrors: string[] = []
      const clientPosts: Array<Record<string, unknown>> = []
      page.on("pageerror", (err) => pageErrors.push(err.message))
      await page.route("**/api/client-errors", async (route) => {
        const body = route.request().postDataJSON() as Record<string, unknown>
        clientPosts.push(body)
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ eventId: body.eventId || "MAP001" }),
        })
      })

      await page.setViewportSize({ width: 390, height: 844 })
      await page.goto("/mapa", { waitUntil: "domcontentloaded" })
      await expect(page.getByTestId("bottom-nav")).toBeVisible({ timeout: 12_000 })

      const targets = [
        { slot: "favoritos" as const, path: /\/favoritos|\/login/ },
        { slot: "perfil" as const, path: /\/perfil|\/login/ },
        { slot: "sugerir" as const, path: /\/sugerir/ },
        { slot: "home-map" as const, path: /\/$/ },
      ]

      for (const t of targets) {
        await softEnterMapa(page).catch(async () => {
          await page.goto("/mapa", { waitUntil: "domcontentloaded" })
        })
        await softLeaveMapa(page).catch(async () => {
          await clickBottomNav(page, t.slot)
          await page.waitForURL(t.path, { timeout: 12_000 })
        })
        if (t.slot !== "home-map") {
          await clickBottomNav(page, t.slot)
          await page.waitForURL(t.path, { timeout: 12_000 })
        }
        await expect(page.getByTestId("app-error-boundary")).toHaveCount(0)
        await assertNoAppCrash(page)
      }

      // 20 ciclos mapa ↔ favoritos
      for (let i = 0; i < 20; i++) {
        await softEnterMapa(page)
        await softLeaveMapa(page)
        await expect(page.getByTestId("app-error-boundary")).toHaveCount(0)
      }

      const stats = await readMapboxLifecycleStats(page)
      expect(stats?.peakActive ?? 0).toBeLessThanOrEqual(1)
      expect(pageErrors.filter((m) => /_map\.off|removeControl/i.test(m))).toEqual([])
      expect(
        clientPosts.filter(
          (p) =>
            p.source === "page-boundary" ||
            String(p.message || "").includes("_map.off")
        )
      ).toEqual([])
    })
  }
})
