/**
 * @jest-environment node
 */
import { readFileSync, existsSync } from "fs"
import path from "path"
import { NextRequest } from "next/server"
import { parsePageParam } from "@/lib/seo/landing-variants"

const root = path.join(__dirname, "../../..")
const read = (rel: string) => readFileSync(path.join(root, rel), "utf8")
/** El código sin comentarios (los comentarios pueden nombrar searchParams). */
const code = (rel: string) => read(rel).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

// La versión limpia de cada landing tiene que quedar estática (ISR). Si su page.tsx
// lee searchParams, Next la vuelve dinámica y cada visita va a Mongo (~15 queries
// en ciudad, 188 ms en el servidor medido el 18/10).
const LANDINGS = [
  { page: "app/sin-gluten/[ciudadSlug]/page.tsx", variant: "app/sin-gluten/[ciudadSlug]/filtrado/page.tsx" },
  {
    page: "app/sin-gluten/[ciudadSlug]/[categoriaSlug]/page.tsx",
    variant: "app/sin-gluten/[ciudadSlug]/[categoriaSlug]/filtrado/page.tsx",
  },
  { page: "app/categoria/[category]/page.tsx", variant: "app/categoria/[category]/filtrado/page.tsx" },
]

describe("landings SEO estáticas", () => {
  it.each(LANDINGS)("$page no lee searchParams y tiene revalidate", ({ page }) => {
    const src = code(page)
    expect(src).not.toMatch(/searchParams|headers\(\)|cookies\(\)|force-dynamic/)
    expect(src).toContain("export const revalidate = 3600")
  })

  it.each(LANDINGS)("$variant atiende la query y es dinámica", ({ variant }) => {
    expect(existsSync(path.join(root, variant))).toBe(true)
    const src = read(variant)
    expect(src).toContain('export const dynamic = "force-dynamic"')
    expect(src).toContain("searchParams")
  })

  it("las variantes nunca son indexables", () => {
    expect(read("app/sin-gluten/[ciudadSlug]/filtrado/page.tsx")).toMatch(/cityLandingMetadata\([\s\S]*?,\s*true\)/)
    expect(read("app/sin-gluten/[ciudadSlug]/[categoriaSlug]/filtrado/page.tsx")).toMatch(
      /categoryLandingMetadata\([\s\S]*?,\s*true\)/
    )
    expect(read("app/categoria/[category]/filtrado/page.tsx")).toMatch(/nationalCategoryMetadata\([\s\S]*?,\s*true\)/)
  })
})

describe("rewrites de next.config.js", () => {
  const { pathToRegexp } = require("next/dist/compiled/path-to-regexp")

  async function loadRewrites() {
    const config = require("../../../next.config.js")
    return (await config.rewrites()).beforeFiles as {
      source: string
      has: { type: string; key: string }[]
      destination: string
    }[]
  }

  function resolve(rules: Awaited<ReturnType<typeof loadRewrites>>, pathname: string, query: string[]) {
    return rules.find(
      (r) => pathToRegexp(r.source).test(pathname) && r.has.every((h) => h.type === "query" && query.includes(h.key))
    )
  }

  it("?page= y ?barrio= de ciudad van a /filtrado; sin query, a la página estática", async () => {
    const rules = await loadRewrites()
    expect(resolve(rules, "/sin-gluten/cordoba", ["page"])?.destination).toBe("/sin-gluten/:ciudadSlug/filtrado")
    expect(resolve(rules, "/sin-gluten/cordoba", ["barrio"])?.destination).toBe("/sin-gluten/:ciudadSlug/filtrado")
    expect(resolve(rules, "/sin-gluten/cordoba", ["utm_source"])).toBeUndefined()
    expect(resolve(rules, "/sin-gluten/cordoba", [])).toBeUndefined()
  })

  it("?page= de ciudad + categoría va a /filtrado", async () => {
    const rules = await loadRewrites()
    expect(resolve(rules, "/sin-gluten/cordoba/restaurantes", ["page"])?.destination).toBe(
      "/sin-gluten/:ciudadSlug/:categoriaSlug/filtrado"
    )
  })

  it("no toca las páginas de provincia", async () => {
    const rules = await loadRewrites()
    expect(resolve(rules, "/sin-gluten/provincia/caba", ["page"])).toBeUndefined()
    expect(resolve(rules, "/sin-gluten/provincia", ["page"])).toBeUndefined()
  })
})

describe("middleware: /{categoria}-sin-gluten", () => {
  it("con ?page= reescribe a la variante y sin query a la página estática", async () => {
    const { middleware } = await import("@/middleware")
    const withPage = await middleware(new NextRequest("https://www.celimap.com.ar/restaurantes-sin-gluten?page=2"))
    expect(withPage.headers.get("x-middleware-rewrite")).toContain("/categoria/restaurantes/filtrado?page=2")
    const clean = await middleware(new NextRequest("https://www.celimap.com.ar/restaurantes-sin-gluten"))
    const target = clean.headers.get("x-middleware-rewrite") ?? ""
    expect(target).toContain("/categoria/restaurantes")
    expect(target).not.toContain("filtrado")
  })
})

describe("parsePageParam", () => {
  it("lee el número de página como antes y no devuelve NaN", () => {
    expect(parsePageParam(undefined)).toBe(1)
    expect(parsePageParam("3")).toBe(3)
    expect(parsePageParam("0")).toBe(1)
    expect(parsePageParam("abc")).toBe(1)
    expect(parsePageParam(["2", "5"])).toBe(2)
  })
})
