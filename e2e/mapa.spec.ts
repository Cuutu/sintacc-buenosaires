/**
 * @hermetic @mobile — mapa lifecycle con adapter mock E2E (no WebGL real)
 */
import { test, expect } from "@playwright/test"
import {
  attachPageErrorGuards,
  assertNoAppCrash,
  assertPageErrorsClean,
  assertHappyPathNetwork,
  installHappyPathMocks,
  installMapboxE2eAdapter,
  readMapboxLifecycleStats,
  countMapCanvases,
  waitForMapAdapterOrFallback,
  softLeaveMapa,
  softEnterMapa,
} from "./helpers"

test.describe("mapa lifecycle @hermetic @mobile", () => {
  test("adapter mock + 10 ciclos + peakActive=1", async ({ page }) => {
    await installHappyPathMocks(page)
    await installMapboxE2eAdapter(page)
    const guards = attachPageErrorGuards(page)
    const cancels: string[] = []
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/mapa", { waitUntil: "domcontentloaded" })

    expect(await waitForMapAdapterOrFallback(page)).toBe("mock")
    await expect(page.getByText(/No pudimos cargar el mapa/i)).toHaveCount(0)

    for (let i = 0; i < 10; i++) {
      await softLeaveMapa(page)
      expect((await readMapboxLifecycleStats(page))!.active).toBe(0)
      await softEnterMapa(page)
      await waitForMapAdapterOrFallback(page)
      const s = await readMapboxLifecycleStats(page)
      expect(s!.active).toBe(1)
      expect(s!.peakActive).toBe(1)
      expect(await countMapCanvases(page)).toBe(1)
    }

    const final = await readMapboxLifecycleStats(page)
    test.info().annotations.push({
      type: "mapbox-lifecycle",
      description: JSON.stringify({
        mode: "e2e-mock-adapter",
        webglReal: false,
        ...final,
        canvases: await countMapCanvases(page),
      }),
    })

    await assertNoAppCrash(page)
    assertHappyPathNetwork(guards.responses500, guards.networkFailures)
    assertPageErrorsClean(guards.pageErrors, {
      baseHost: "127.0.0.1:3000",
      webkitRscCancels: cancels,
    })
  })
})
