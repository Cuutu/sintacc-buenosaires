/**
 * @jest-environment node
 */
import { NextRequest } from "next/server"
import { getMiddlewareMatchers } from "next/dist/build/analysis/get-page-static-info"
import { getMiddlewareRouteMatcher } from "next/dist/shared/lib/router/utils/middleware-route-matcher"
import { config, middleware } from "@/middleware"

// Mismo compilador de matchers y mismo matcher de runtime que usa Next.
const matches = getMiddlewareRouteMatcher(getMiddlewareMatchers(config.matcher, {}))
type MatchRequest = Parameters<typeof matches>[1]

function runs(path: string, host = "www.celimap.com.ar") {
  return matches(path, { headers: { host } } as unknown as MatchRequest, {})
}

async function hasEffect(path: string, host: string) {
  const res = await middleware(new NextRequest(`https://${host}${path}`, { headers: { host } }))
  return !(res.headers.get("x-middleware-next") && Array.from(res.headers.keys()).length === 1)
}

// Alcance del matcher anterior (todas las páginas): el nuevo nunca debe salirse de acá.
const IN_PREVIOUS_SCOPE = /^\/(?!_next|api|.*\..*)/

describe("middleware matcher", () => {
  it.each([
    "/admin",
    "/admin/lugares",
    "/listas/privadas/abc",
    "/restaurantes-sin-gluten",
    "/Restaurantes-Sin-Gluten",
    "/restaurantes-sin-gluten/caba",
    "/top-sin-gluten-caba",
    "/TOP-SIN-GLUTEN-CABA",
    "/top-sin-gluten/ciudad/caba",
  ])("corre en %s", (path) => {
    expect(runs(path)).toBe(true)
  })

  it.each([
    "/",
    "/mapa",
    "/explorar",
    "/lugar/rojas-gluten-free-caballito",
    "/sin-gluten/caba",
    "/sin-gluten/caba/restaurantes",
    "/sin-gluten/provincia/buenos-aires",
    "/sin-gluten-argentina",
    "/api/places",
    "/_next/static/chunk.js",
    "/robots.txt",
    "/admin/logo.png",
  ])("no corre en %s (www)", (path) => {
    expect(runs(path)).toBe(false)
  })

  it("en el apex corre en páginas (redirect a www) pero no en /api ni archivos", () => {
    expect(runs("/", "celimap.com.ar")).toBe(true)
    expect(runs("/mapa", "celimap.com.ar")).toBe(true)
    expect(runs("/api/health", "celimap.com.ar")).toBe(false)
    expect(runs("/robots.txt", "celimap.com.ar")).toBe(false)
  })

  it("cubre toda ruta donde el middleware tiene efecto, sin salirse del alcance anterior", async () => {
    const segs = [
      "", "admin", "Admin", "adminx", "listas", "privadas", "caba", "CABA", "ciudad", "lugar", "mapa",
      "sin-gluten", "sin-gluten-argentina", "restaurantes-sin-gluten", "Cafes-Sin-Gluten",
      "a-sin-gluten", "top-sin-gluten", "top-sin-gluten-caba", "TOP-SIN-GLUTEN-CABA",
      "api", "_next", "x.png",
    ]
    const paths = new Set(["/"])
    for (const a of segs) {
      paths.add(`/${a}`)
      for (const b of segs) {
        paths.add(`/${a}/${b}`)
        for (const c of ["", "caba", "x.png"]) paths.add(`/${a}/${b}/${c}`)
      }
    }

    const problems: string[] = []
    for (const host of ["www.celimap.com.ar", "celimap.com.ar"]) {
      for (const path of Array.from(paths)) {
        const inScope = IN_PREVIOUS_SCOPE.test(path)
        const matched = runs(path, host)
        if (!inScope && matched) problems.push(`corre fuera de alcance: ${host}${path}`)
        if (inScope && !matched && (await hasEffect(path, host))) {
          problems.push(`efecto sin matcher: ${host}${path}`)
        }
      }
    }
    expect(problems).toEqual([])
  })
})
