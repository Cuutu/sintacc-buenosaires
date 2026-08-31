/**
 * @jest-environment node
 */
import fs from "fs"
import path from "path"

const root = path.join(__dirname, "..")
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8")

describe("PR1 ficha lugar SSR", () => {
  it("page es Server Component con notFound, redirect y nearby", () => {
    const page = read("app/lugar/[id]/page.tsx")
    expect(page).not.toContain('"use client"')
    expect(page).not.toMatch(/^["']use client["']/)
    expect(page).toContain("export default async function LugarPage")
    expect(page).toContain("notFound()")
    expect(page).toContain("permanentRedirect")
    expect(page).toContain("getApprovedPlaceByRouteParam")
    expect(page).toContain("<h1")
    expect(page).toContain("place.name")
    expect(page).toContain("PlaceInfoCard")
    expect(page).toContain("PlaceNearbyRail")
    expect(page).toContain("getNearbyPlacesForPlace")
    expect(page).toContain("PlaceCommunityReviewsClient")
    expect(page).toContain("revalidate = 3600")
    expect(page).not.toContain("useEffect")
    expect(page).not.toContain("fetchPlace")
  })

  it("layout ISR, sin force-dynamic, cache en loader", () => {
    const layout = read("app/lugar/[id]/layout.tsx")
    const loader = read("lib/place-route.ts")
    expect(layout).toContain("revalidate = 3600")
    expect(layout).not.toContain("force-dynamic")
    expect(layout).toContain("getApprovedPlaceByRouteParam")
    expect(layout).toContain("notFound()")
    expect(loader).toContain('from "react"')
    expect(loader).toContain("cache(")
  })
})
