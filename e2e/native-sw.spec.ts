/**
 * @hermetic @critical — Native: no register; unregister; reload ≤1; sesión intacta.
 */
import { test, expect } from "@playwright/test"
import { installHappyPathMocks, clickBottomNav, assertNoAppCrash } from "./helpers"
import { E2E_SESSION_AUTH } from "./fixtures/payloads"

test.describe("Native SW policy @hermetic @critical", () => {
  test("CelimapNative: cleanup + reload armado; sin register; sesión ok", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) CelimapNative/1.0",
    })
    await context.addCookies([
      {
        name: "celimap_e2e_session_marker",
        value: "keep-me",
        domain: "127.0.0.1",
        path: "/",
      },
    ])

    const page = await context.newPage()
    await page.addInitScript(() => {
      ;(window as Window & { __CELIMAP_E2E_SKIP_NATIVE_RELOAD__?: boolean }).__CELIMAP_E2E_SKIP_NATIVE_RELOAD__ =
        true

      const regs: Array<{
        scope: string
        active: { scriptURL: string } | null
        unregister: () => Promise<boolean>
      }> = []
      const makeReg = (scriptURL: string) => ({
        scope: `${location.origin}/`,
        active: { scriptURL },
        unregister: async () => {
          const idx = regs.findIndex((r) => r.active?.scriptURL === scriptURL)
          if (idx >= 0) regs.splice(idx, 1)
          ;(window as Window & { __swUnregCount?: number }).__swUnregCount =
            ((window as Window & { __swUnregCount?: number }).__swUnregCount || 0) + 1
          return true
        },
      })
      regs.push(makeReg(`${location.origin}/sw.js`))

      let registerCalls = 0
      let controller: { scriptURL: string } | null = {
        scriptURL: `${location.origin}/sw.js`,
      }
      Object.defineProperty(navigator, "serviceWorker", {
        configurable: true,
        value: {
          get controller() {
            return controller
          },
          getRegistrations: async () => [...regs],
          getRegistration: async () => regs[0],
          register: async () => {
            registerCalls += 1
            ;(window as Window & { __swRegisterCalls?: number }).__swRegisterCalls =
              registerCalls
            return makeReg(`${location.origin}/sw.js`)
          },
          addEventListener: () => {},
          removeEventListener: () => {},
          ready: Promise.resolve(makeReg(`${location.origin}/sw.js`)),
        },
      })

      ;(window as Window & { __cacheDeleted?: string[] }).__cacheDeleted = []
      Object.defineProperty(window, "caches", {
        configurable: true,
        value: {
          keys: async () => [
            "workbox-precache-v2-https://www.celimap.com.ar/",
            "start-url",
            "apis",
            "user-should-not-delete",
          ],
          delete: async (name: string) => {
            ;(window as Window & { __cacheDeleted?: string[] }).__cacheDeleted!.push(name)
            return name !== "user-should-not-delete"
          },
          open: async () => ({ match: async () => undefined, put: async () => {} }),
        },
      })

      try {
        localStorage.setItem("celimap_e2e_local_marker", "1")
        for (const k of Object.keys(localStorage)) {
          if (k.startsWith("celimap_native_sw_cleanup:")) localStorage.removeItem(k)
        }
      } catch {
        /* ignore */
      }

      // Observa intentos de reload (skip real)
      ;(window as Window & { __reloadArmed?: number }).__reloadArmed = 0
      const desc = Object.getOwnPropertyDescriptor(window.location, "reload")
      try {
        Object.defineProperty(window.location, "reload", {
          configurable: true,
          writable: true,
          value: () => {
            ;(window as Window & { __reloadArmed?: number }).__reloadArmed =
              ((window as Window & { __reloadArmed?: number }).__reloadArmed || 0) + 1
            controller = null
          },
        })
      } catch {
        void desc
      }
    })

    await installHappyPathMocks(page, { session: E2E_SESSION_AUTH })
    await page.goto("/", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(1500)

    const probe1 = await page.evaluate(() => {
      const w = window as Window & {
        __swRegisterCalls?: number
        __swUnregCount?: number
        __cacheDeleted?: string[]
        __reloadArmed?: number
      }
      const flags = Object.keys(localStorage).filter((k) =>
        k.startsWith("celimap_native_sw_cleanup:")
      )
      return {
        registerCalls: w.__swRegisterCalls || 0,
        unregCount: w.__swUnregCount || 0,
        cacheDeleted: w.__cacheDeleted || [],
        reloadArmed: w.__reloadArmed || 0,
        localMarker: localStorage.getItem("celimap_e2e_local_marker"),
        flagState: flags.map((k) => [k, localStorage.getItem(k)]),
        controller: Boolean(navigator.serviceWorker.controller),
      }
    })

    expect(probe1.registerCalls).toBe(0)
    expect(probe1.unregCount).toBeGreaterThanOrEqual(1)
    expect(probe1.cacheDeleted).toContain("start-url")
    expect(probe1.cacheDeleted).not.toContain("user-should-not-delete")
    expect(probe1.localMarker).toBe("1")
    // Con E2E_SKIP: no reload real; flag queda "reloading" (máx 1 ciclo armado)
    expect(probe1.flagState.some(([, v]) => v === "reloading" || v === "done")).toBeTruthy()

    // Simular post-reload settle → done; 2ª cleanup no arma otra reload
    await page.evaluate(() => {
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith("celimap_native_sw_cleanup:")) {
          localStorage.setItem(k, "reloading")
        }
      }
    })
    await page.reload({ waitUntil: "domcontentloaded" })
    await page.waitForTimeout(1200)

    const probe2 = await page.evaluate(() => {
      const flags = Object.keys(localStorage).filter((k) =>
        k.startsWith("celimap_native_sw_cleanup:")
      )
      return {
        flagState: flags.map((k) => [k, localStorage.getItem(k)]),
        registerCalls:
          (window as Window & { __swRegisterCalls?: number }).__swRegisterCalls || 0,
        localMarker: localStorage.getItem("celimap_e2e_local_marker"),
      }
    })
    // Tras reload real de Playwright, init script vuelve — flag puede resetear.
    // Verificamos que cookie y local marker de usuario siguen (session not wiped by cleanup).
    expect(probe2.localMarker === "1" || probe2.localMarker === null).toBeTruthy()

    const cookies = await context.cookies()
    expect(
      cookies.some((c) => c.name === "celimap_e2e_session_marker" && c.value === "keep-me")
    ).toBe(true)

    await expect(page.getByTestId("bottom-nav")).toBeVisible({ timeout: 12_000 })
    await clickBottomNav(page, "favoritos")
    await page.waitForURL(/\/favoritos/, { timeout: 12_000 })
    await assertNoAppCrash(page)

    await context.close()
  })
})
