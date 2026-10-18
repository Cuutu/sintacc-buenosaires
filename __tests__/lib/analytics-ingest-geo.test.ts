/**
 * @jest-environment node
 */
import { NextRequest } from "next/server"
import { geoFromRequest } from "@/lib/analytics-ingest"

const headers = {
  "x-vercel-ip-country": "AR",
  "x-vercel-ip-country-region": "C",
  "x-vercel-ip-city": "Buenos%20Aires",
}

describe("geoFromRequest", () => {
  const originalVercel = process.env.VERCEL

  afterEach(() => {
    if (originalVercel === undefined) delete process.env.VERCEL
    else process.env.VERCEL = originalVercel
  })

  it("fuera de Vercel ignora los headers (el cliente los puede inventar)", () => {
    delete process.env.VERCEL
    const request = new NextRequest("http://localhost:3000", { headers })
    expect(geoFromRequest(request)).toEqual({ country: "", region: "", city: "" })
  })

  it("en Vercel los lee y decodifica", () => {
    process.env.VERCEL = "1"
    const request = new NextRequest("http://localhost:3000", { headers })
    expect(geoFromRequest(request)).toEqual({ country: "AR", region: "C", city: "Buenos Aires" })
  })
})
