import { readFileSync } from "fs"
import path from "path"

const root = path.join(__dirname, "../../..")

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8")
}

const WRITE_PATTERNS = [
  /\.save\s*\(/,
  /\.create\s*\(/,
  /\.insertMany\s*\(/,
  /\.updateOne\s*\(/,
  /\.updateMany\s*\(/,
  /\.findOneAndUpdate\s*\(/,
  /\.deleteOne\s*\(/,
  /\.deleteMany\s*\(/,
  /\.findByIdAndDelete\s*\(/,
  /\.findByIdAndUpdate\s*\(/,
  /writeFileSync\s*\(/,
  /writeFile\s*\(/,
]

describe("SEO diagnose scripts are read-only", () => {
  const scripts = [
    "scripts/diagnose-city-seo.ts",
    "scripts/diagnose-city-geo.ts",
    "scripts/audit-sitemap-sample.ts",
  ]

  it.each(scripts)("%s no escribe Mongo ni filesystem", (rel) => {
    const src = read(rel)
    expect(src).toMatch(/read-only/i)
    for (const re of WRITE_PATTERNS) {
      expect(src).not.toMatch(re)
    }
    expect(src).not.toMatch(/Place\.(update|create|delete)/)
    expect(src).not.toMatch(/List\.(update|create|delete)/)
  })

  it("diagnose scripts cargan .env.local vía loadEnvFiles", () => {
    const geo = read("scripts/diagnose-city-geo.ts")
    const seo = read("scripts/diagnose-city-seo.ts")
    expect(geo).toContain("loadEnvFiles")
    expect(seo).toContain("loadEnvFiles")
    expect(read("scripts/load-env.ts")).toContain(".env.local")
  })

  it("diagnose-city-geo usa proyección limitada (sin dump completo)", () => {
    const src = read("scripts/diagnose-city-geo.ts")
    expect(src).toContain("address_summary")
    expect(src).toContain("place_id")
    expect(src).not.toContain("console.log(JSON.stringify(places")
    expect(src).not.toContain("privateAccessToken")
    expect(src).not.toMatch(/\buser\.email\b|\bemail\s*:/)
  })

  it("diagnose-city-seo resume decisión de indexación", () => {
    const src = read("scripts/diagnose-city-seo.ts")
    expect(src).toContain("decision:")
    expect(src).toContain("evaluateCityPageIndexability")
    expect(src).toContain("process.exit(1)")
  })
})
