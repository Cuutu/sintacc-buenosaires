/**
 * @hermetic — E2E local contra next start; mocks 200; sin Mongo.
 * Ficha completa / favoritos autenticados = @staging (pendiente URL).
 */
import { test, expect, type Page } from "@playwright/test"
import {
  MOBILE_VIEWPORTS,
  TABLET_VIEWPORT,
  DESKTOP_VIEWPORT,
  attachPageErrorGuards,
  assertNoAppCrash,
  assertBodyHasVisibleContent,
  assertNoAccidentalOverflow,
  assertHappyPathNetwork,
  assertPageErrorsClean,
  installHappyPathMocks,
  installMapboxE2eAdapter,
} from "./helpers"
import { E2E_PLACE } from "./fixtures/payloads"

const SMOKE_ROUTES = [
  { path: "/", name: "home" },
  { path: "/mapa", name: "mapa" },
  { path: "/favoritos", name: "favoritos" },
  { path: "/login", name: "login" },
  { path: "/sugerir", name: "sugerir" },
] as const

async function smokeRoute(page: Page, path: string, expectBottomNav: boolean) {
  const guards = attachPageErrorGuards(page)
  const webkitRscCancels: string[] = []
  const host = new URL(test.info().project.use.baseURL || "http://127.0.0.1:3000").host

  await page.goto(path, { waitUntil: "domcontentloaded" })
  await page.waitForTimeout(700)
  if (path === "/favoritos") {
    await Promise.race([
      page.waitForURL(/\/login/, { timeout: 8_000 }),
      page.locator("body").getByText(/.{20,}/).first().waitFor({ timeout: 8_000 }),
    ]).catch(() => null)
  }
  await assertNoAppCrash(page)
  await assertBodyHasVisibleContent(page)

  if (expectBottomNav) {
    const vw = page.viewportSize()?.width ?? 390
    if (vw <= 768) {
      await expect(
        page.getByRole("navigation", { name: /Navegacion principal/i })
      ).toBeVisible({ timeout: 8_000 })
    }
  }

  await assertNoAccidentalOverflow(page, path)
  assertHappyPathNetwork(guards.responses500, guards.networkFailures)
  assertPageErrorsClean(guards.pageErrors, { baseHost: host, webkitRscCancels })
  if (webkitRscCancels.length) {
    test.info().annotations.push({
      type: "webkit-rsc-cancel",
      description: `${webkitRscCancels.length}x: ${webkitRscCancels[0]}`,
    })
  }
}

test.describe("smoke rutas @hermetic @mobile", () => {
  test.beforeEach(async ({ page }) => {
    await installHappyPathMocks(page)
    await installMapboxE2eAdapter(page)
  })

  for (const vp of MOBILE_VIEWPORTS) {
    test(`mobile ${vp.name} — rutas smoke`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      for (const route of SMOKE_ROUTES) {
        await smokeRoute(page, route.path, true)
      }
    })
  }

  test("tablet — rutas smoke", async ({ page }) => {
    await page.setViewportSize({
      width: TABLET_VIEWPORT.width,
      height: TABLET_VIEWPORT.height,
    })
    for (const route of SMOKE_ROUTES) {
      await smokeRoute(page, route.path, true)
    }
  })

  test("desktop — rutas smoke", async ({ page }) => {
    await page.setViewportSize({
      width: DESKTOP_VIEWPORT.width,
      height: DESKTOP_VIEWPORT.height,
    })
    for (const route of SMOKE_ROUTES) {
      await smokeRoute(page, route.path, false)
    }
  })
})

test.describe("ficha lugar @hermetic @mobile", () => {
  test("lugar con fixture places 200", async ({ page }) => {
    await installHappyPathMocks(page)
    await page.setViewportSize({ width: 390, height: 844 })
    const guards = attachPageErrorGuards(page)

    await page.goto(`/lugar/${E2E_PLACE.slug}`, { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(500)
    await assertNoAppCrash(page)
    await assertBodyHasVisibleContent(page)
    const html = await page.content()
    expect(html).not.toMatch(/Bearer\s+[A-Za-z0-9._\-]{20,}/)
    expect(html).not.toMatch(/sk_live_|NEXTAUTH_SECRET/)
    assertHappyPathNetwork(guards.responses500, guards.networkFailures)
  })
})
