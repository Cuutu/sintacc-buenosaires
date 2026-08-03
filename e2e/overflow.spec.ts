/**
 * @hermetic @mobile — overflow document + bounding boxes
 */
import { test, expect } from "@playwright/test"
import {
  MOBILE_VIEWPORTS,
  attachPageErrorGuards,
  assertNoAppCrash,
  assertDocumentNoHorizontalScroll,
  assertNoAccidentalOverflow,
  assertPageErrorsClean,
  ALLOWED_OVERFLOW_MARKERS,
  installHappyPathMocks,
  installMapboxE2eAdapter,
} from "./helpers"

test.describe("overflow horizontal @hermetic @mobile", () => {
  test("marcadores allowlist exactos documentados", () => {
    expect([...ALLOWED_OVERFLOW_MARKERS].sort()).toEqual(
      [
        "decoration",
        "featured-carousel",
        "map-chips",
        "mapbox-canvas",
        "stats-carousel",
      ].sort()
    )
  })

  for (const vp of MOBILE_VIEWPORTS) {
    test(`home overflow ${vp.name}`, async ({ page }) => {
      await installHappyPathMocks(page)
      const guards = attachPageErrorGuards(page)
      const cancels: string[] = []
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto("/", { waitUntil: "domcontentloaded" })
      await page.waitForTimeout(600)
      await assertNoAppCrash(page)
      const doc = await assertDocumentNoHorizontalScroll(page)
      expect(doc.ok).toBe(true)
      await assertNoAccidentalOverflow(page, `home@${vp.name}`)
      assertPageErrorsClean(guards.pageErrors, {
        baseHost: "127.0.0.1:3000",
        webkitRscCancels: cancels,
      })
    })

    test(`mapa overflow ${vp.name}`, async ({ page }) => {
      await installHappyPathMocks(page)
      await installMapboxE2eAdapter(page)
      const guards = attachPageErrorGuards(page)
      const cancels: string[] = []
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto("/mapa", { waitUntil: "domcontentloaded" })
      await page.waitForTimeout(800)
      await assertNoAppCrash(page)
      await assertDocumentNoHorizontalScroll(page)
      await assertNoAccidentalOverflow(page, `mapa@${vp.name}`)
      assertPageErrorsClean(guards.pageErrors, {
        baseHost: "127.0.0.1:3000",
        webkitRscCancels: cancels,
      })
    })
  }
})
