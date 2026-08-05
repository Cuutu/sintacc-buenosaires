import { chromium } from "@playwright/test"

const base = process.env.REPRO_BASE || "http://127.0.0.1:3000"
const mode = process.env.REPRO_MODE || "auth" // auth | unauth | auth-bad-image | sw

const AUTH_SESSION = {
  user: {
    name: "E2E User",
    email: "e2e@example.com",
    image:
      mode === "auth-bad-image"
        ? "https://evil.example.com/avatar.png"
        : "https://lh3.googleusercontent.com/a/e2e",
    role: "user",
  },
  expires: "2099-01-01T00:00:00.000Z",
}

async function main() {
  const browser = await chromium.launch()
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    serviceWorkers: mode === "sw" ? "allow" : "block",
  })
  const page = await context.newPage()
  const pageErrors = []
  const consoleErrors = []

  page.on("pageerror", (e) => {
    pageErrors.push({ msg: e.message, stack: e.stack, t: Date.now() })
    console.log("\n==== FIRST/PAGEERROR ====")
    console.log(e.message)
    console.log(e.stack)
    console.log("==== END ====\n")
  })
  page.on("console", (m) => {
    if (m.type() === "error") {
      consoleErrors.push(m.text())
      console.log("CONSOLE", m.text().slice(0, 400))
    }
  })

  await page.addInitScript(() => {
    window.addEventListener("unhandledrejection", (e) => {
      window.__rej = window.__rej || []
      const r = e.reason
      window.__rej.push(String(r && (r.stack || r.message || r)))
      console.error("UNHANDLED", String(r && (r.stack || r.message || r)))
    })
    try {
      localStorage.setItem("celimap_onboarded", "1")
    } catch {}
  })

  const sessionBody = mode.startsWith("auth") ? AUTH_SESSION : null

  await page.route("**/api/auth/session", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(sessionBody),
    })
  )
  await page.route("**/api/auth/csrf", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ csrfToken: "e2e" }),
    })
  )
  await page.route("**/api/auth/providers", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  )
  await page.route("**/api/auth/_log", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  )
  await page.route("**/api/favorites**", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ favorites: [] }),
    })
  )
  await page.route("**/api/lists**", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ lists: [] }),
    })
  )
  await page.route("**/api/stats**", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ placesCount: 1, reviewsCount: 1, usersCount: 1 }),
    })
  )
  await page.route("**/api/places**", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        places: [],
        pagination: { page: 1, limit: 50, total: 0, pages: 0 },
      }),
    })
  )

  await page.goto(base + "/", { waitUntil: "domcontentloaded", timeout: 60000 })
  await page.waitForTimeout(1200)

  const nav = page.getByTestId("bottom-nav")
  if (!(await nav.isVisible().catch(() => false))) {
    console.log("NO NAV", (await page.locator("body").innerText()).slice(0, 400))
    await browser.close()
    process.exit(2)
  }

  async function click(name) {
    const before = pageErrors.length
    const link = nav.getByRole("link", { name })
    const btn = nav.getByRole("button", { name })
    if ((await link.count()) > 0) await link.first().click({ timeout: 8000 })
    else await btn.first().click({ timeout: 8000 })
    await page.waitForTimeout(900)
    const body = await page.locator("body").innerText()
    const crash = /tuvo un problema|Application error|Algo falló/i.test(body)
    const entry = {
      name,
      url: page.url(),
      crash,
      newErrors: pageErrors.slice(before),
      snippet: body.replace(/\s+/g, " ").trim().slice(0, 200),
    }
    console.log("STEP", JSON.stringify(entry))
    return entry
  }

  const steps = []
  for (const name of ["Guardados", "Perfil", "Guardados", "Perfil", "Guardados"]) {
    steps.push(await click(name))
    if (steps.at(-1).crash || steps.at(-1).newErrors.length) {
      // keep going once to see fallback UI
    }
  }

  // Home → Mapa → Favoritos → Perfil
  try {
    const home = nav.getByRole("link", { name: "Home" }).or(nav.getByRole("link", { name: "Mapa" }))
    if ((await home.count()) > 0) {
      await home.first().click()
      await page.waitForTimeout(600)
    }
  } catch {}
  for (const t of ["Mapa", "Guardados", "Perfil"]) {
    try {
      steps.push(await click(t))
    } catch (e) {
      steps.push({ name: t, err: String(e.message).slice(0, 160) })
    }
  }

  // 20 cycles all tabs
  for (let i = 0; i < 20; i++) {
    for (const t of ["Mapa", "Guardados", "Sugerir", "Perfil"]) {
      try {
        // On map first tab becomes Home
        const label =
          t === "Mapa" && page.url().includes("/mapa")
            ? (await nav.getByRole("link", { name: "Home" }).count()) > 0
              ? "Home"
              : "Mapa"
            : t
        steps.push(await click(label === "Home" ? "Home" : t === "Mapa" ? "Mapa" : t))
      } catch (e) {
        // try alternate
        try {
          steps.push(await click(t === "Mapa" ? "Home" : t))
        } catch (e2) {
          steps.push({ name: t, err: String(e2.message).slice(0, 160) })
        }
      }
    }
  }

  const rej = await page.evaluate(() => window.__rej || [])
  const boundaryCount = await page.evaluate(() => {
    return {
      previewBadges: document.querySelectorAll("[data-preview-badge]").length,
      bottomNavs: document.querySelectorAll("[data-testid=bottom-nav]").length,
      mapCanvases: document.querySelectorAll("canvas").length,
    }
  })

  console.log(
    JSON.stringify(
      {
        base,
        mode,
        pageErrors,
        firstStack: pageErrors[0]?.stack || null,
        consoleErrors: consoleErrors.slice(0, 20),
        rej,
        crashes: steps.filter((s) => s.crash || (s.newErrors && s.newErrors.length) || s.err),
        totalSteps: steps.length,
        boundaryCount,
      },
      null,
      2
    )
  )
  await browser.close()
  if (pageErrors.length || steps.some((s) => s.crash)) process.exit(3)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
