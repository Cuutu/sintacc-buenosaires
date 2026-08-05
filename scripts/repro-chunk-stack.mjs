import { chromium } from "@playwright/test"

const base = process.env.REPRO_BASE || "http://127.0.0.1:3000"

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
const pageErrors = []

page.on("pageerror", (e) => {
  pageErrors.push({ msg: e.message, stack: e.stack })
  console.log("==== STACK ====")
  console.log(e.stack || e.message)
  console.log("==== END ====")
})

await page.addInitScript(() => {
  try {
    localStorage.setItem("celimap_onboarded", "1")
  } catch {}
})

await page.route("**/api/**", async (route) => {
  const u = route.request().url()
  if (u.includes("/api/auth/session")) {
    await route.fulfill({ status: 200, contentType: "application/json", body: "null" })
    return
  }
  if (u.includes("/api/stats")) {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ placesCount: 1, reviewsCount: 1, usersCount: 1 }),
    })
    return
  }
  if (u.includes("/api/places")) {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        places: [],
        pagination: { page: 1, limit: 50, total: 0, pages: 0 },
      }),
    })
    return
  }
  if (u.includes("/api/favorites") || u.includes("/api/lists")) {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ favorites: [], lists: [] }),
    })
    return
  }
  if (u.includes("/api/auth/")) {
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
    return
  }
  await route.continue()
})

await page.goto(base + "/", { waitUntil: "domcontentloaded" })
await page.waitForTimeout(800)

await page.route("**/_next/static/chunks/app/**", async (route) => {
  const url = route.request().url()
  if (/favoritos|perfil/.test(url)) {
    await route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: 'throw new Error("ChunkLoadError: Loading chunk failed (synthetic)");',
    })
    return
  }
  await route.continue()
})

const nav = page.getByTestId("bottom-nav")
await nav.locator('[data-nav-slot="favoritos"]').click()
await page.waitForTimeout(2000)
const body = await page.locator("body").innerText()
console.log(
  JSON.stringify(
    {
      url: page.url(),
      crash: /tuvo un problema|Application error|Algo falló/i.test(body),
      pageErrors,
      snippet: body.replace(/\s+/g, " ").slice(0, 220),
    },
    null,
    2
  )
)
await browser.close()
