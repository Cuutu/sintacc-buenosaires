/**
 * @jest-environment node
 */
import fs from "fs"
import path from "path"
import { buildAppleAppSiteAssociation, IOS_APP_ID, IOS_BUNDLE_ID } from "@/lib/apple-app-site-association"
import { GET } from "@/app/.well-known/apple-app-site-association/route"

describe("apple-app-site-association", () => {
  it("opens only the shop panel in the app (not /tarjeta, where customers add the pass)", () => {
    const body = buildAppleAppSiteAssociation()
    const details = body.applinks.details[0]
    expect(details.appIDs).toEqual([IOS_APP_ID])
    const paths = details.components.map((c) => c["/"])
    expect(paths).toEqual(["/local", "/local/*"])
    expect(paths.some((p) => p.startsWith("/tarjeta"))).toBe(false)
  })

  it("uses the iOS bundle from capacitor.config.ts and the domains in the entitlements", () => {
    const cap = fs.readFileSync(path.join(process.cwd(), "capacitor.config.ts"), "utf8")
    expect(cap).toContain(`IOS_APP_ID = "${IOS_BUNDLE_ID}"`)
    const entitlements = fs.readFileSync(path.join(process.cwd(), "ios/App/App/App.entitlements"), "utf8")
    expect(entitlements).toContain("applinks:www.celimap.com.ar")
  })

  it("is served as JSON", async () => {
    const res = GET()
    expect(res.headers.get("content-type")).toContain("application/json")
    expect((await res.json()).applinks.details[0].appIDs).toEqual([IOS_APP_ID])
  })
})
