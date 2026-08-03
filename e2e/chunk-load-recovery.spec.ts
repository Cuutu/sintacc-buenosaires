/**
 * @hermetic @critical — ChunkLoadError: 1 reload/build; 2ª → fallback; clave global.
 */
import { test, expect } from "@playwright/test"
import {
  attachPageErrorGuards,
  installHappyPathMocks,
  readChunkReloadKeys,
  clickBottomNav,
  assertNoAppCrash,
} from "./helpers"
import { E2E_SESSION_AUTH } from "./fixtures/payloads"

test.describe("ChunkLoadError recovery @hermetic @critical", () => {
  test("primera falla → reload; segunda → fallback; clave global por build", async ({
    page,
    context,
  }) => {
    await context.clearCookies()
    await context.route("**/sw.js", (r) => r.abort())
    await installHappyPathMocks(page, { session: E2E_SESSION_AUTH })
    attachPageErrorGuards(page)

    await page.addInitScript(() => {
      const w = window as Window & { __celimapNavLoads?: number }
      w.__celimapNavLoads = 0
      window.addEventListener("load", () => {
        w.__celimapNavLoads = (w.__celimapNavLoads || 0) + 1
      })
    })

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/", { waitUntil: "load" })
    await expect(page.getByTestId("bottom-nav")).toBeVisible({ timeout: 12_000 })
    await page.evaluate(() => sessionStorage.clear())

    const dispatched = await page.evaluate(() => {
      const err = new Error("Loading chunk 99 failed")
      err.name = "ChunkLoadError"
      window.dispatchEvent(
        new ErrorEvent("error", { error: err, message: err.message, filename: "x.js" })
      )
      const keys: string[] = []
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i)
        if (k?.startsWith("celimap_chunk_reload_v1:")) keys.push(k)
      }
      return keys
    })
    expect(dispatched.length).toBe(1)
    expect(dispatched[0]).not.toMatch(/favoritos|perfil/)

    // WebKit: reload va por setTimeout(0)
    await page.waitForEvent("load", { timeout: 15_000 }).catch(() => null)
    await page.waitForTimeout(600)

    const keys = await readChunkReloadKeys(page)
    expect(keys.length).toBe(1)
    expect(keys[0]).not.toMatch(/favoritos|perfil/)

    const keyState = await page.evaluate(() => {
      const out: Record<string, string | null> = {}
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i)
        if (k?.startsWith("celimap_chunk_reload_v1:")) out[k] = sessionStorage.getItem(k)
      }
      return out
    })

    // 2ª falla (otra ruta) — misma clave global → fallback, sin loop
    const loadsMid = await page.evaluate(
      () => (window as Window & { __celimapNavLoads?: number }).__celimapNavLoads || 0
    )
    await page.evaluate(() => {
      history.pushState({}, "", "/favoritos")
      const err = new Error("Loading chunk 99 failed")
      err.name = "ChunkLoadError"
      window.dispatchEvent(
        new ErrorEvent("error", { error: err, message: err.message, filename: "x.js" })
      )
    })
    await page.waitForTimeout(1000)
    await expect(page.getByTestId("chunk-load-fallback")).toBeVisible({ timeout: 5_000 })
    const loadsFinal = await page.evaluate(
      () => (window as Window & { __celimapNavLoads?: number }).__celimapNavLoads || 0
    )
    expect(loadsFinal - loadsMid).toBeLessThanOrEqual(1)

    console.log("[chunk-reload-report]", JSON.stringify({ keys, keyState, loadsMid, loadsFinal }))
  })

  test("chunk dinámico abort → recupera; tabs sin loop", async ({ page, context }) => {
    await context.clearCookies()
    await context.route("**/sw.js", (r) => r.abort())
    await installHappyPathMocks(page, { session: E2E_SESSION_AUTH })

    let fails = 0
    await page.route("**/_next/static/chunks/app/sugerir/**", async (route) => {
      if (fails < 1) {
        fails += 1
        await route.abort("failed")
        return
      }
      await route.continue()
    })

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/", { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("bottom-nav")).toBeVisible({ timeout: 12_000 })
    await clickBottomNav(page, "sugerir")
    await page.waitForTimeout(2000)
    await assertNoAppCrash(page)
    await clickBottomNav(page, "perfil")
    await page.waitForTimeout(800)
    await assertNoAppCrash(page)
    expect(fails).toBeGreaterThanOrEqual(1)
  })
})
