/**
 * @hermetic @critical — login web intacto; native-start no es GET signin.
 */
import { test, expect } from "@playwright/test"
import { installHappyPathMocks } from "./helpers"
import fs from "fs"
import path from "path"

test.describe("Native OAuth contract @hermetic @critical", () => {
  test("fuente: Browser abre native-start, no signin/google GET", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "lib/native-sign-in.ts"),
      "utf8"
    )
    expect(src).toContain("/auth/native-start")
    expect(src).toContain("from: \"native\"")
    expect(src).not.toMatch(/\/api\/auth\/signin\/google/)
  })

  test("web login: Continuar con Google sigue en página (sin crash)", async ({
    page,
    context,
  }) => {
    await context.clearCookies()
    await context.route("**/sw.js", (r) => r.abort())
    await installHappyPathMocks(page)

    let openedNativeStart = false
    let openedSigninGoogleGet = false
    page.on("request", (req) => {
      const u = req.url()
      if (u.includes("/auth/native-start")) openedNativeStart = true
      if (u.includes("/api/auth/signin/google") && req.method() === "GET") {
        openedSigninGoogleGet = true
      }
    })

    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto("/login", { waitUntil: "domcontentloaded" })
    await expect(page.getByRole("button", { name: /Continuar con Google/i })).toBeVisible({
      timeout: 12_000,
    })
    // Web: no es nativo → no debe ir a native-start al render
    expect(openedNativeStart).toBe(false)
    expect(openedSigninGoogleGet).toBe(false)
  })

  test("native-start sin from=native muestra error recuperable", async ({ page }) => {
    await page.goto("/auth/native-start?returnTo=/perfil", {
      waitUntil: "domcontentloaded",
    })
    await expect(
      page.getByText(/solo inicia sesión desde la app Celimap/i)
    ).toBeVisible({ timeout: 8_000 })
  })
})
