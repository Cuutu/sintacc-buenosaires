/**
 * @jest-environment node
 */
import {
  checkPrivacyManifest,
  EXPECTED_COLLECTED_TYPES,
  FORBIDDEN_COLLECTED_TYPES,
} from "@/scripts/check-privacy-manifest"
import fs from "fs"
import path from "path"

describe("privacy-manifest exact Apple identifiers", () => {
  it("check OK", () => {
    const result = checkPrivacyManifest()
    expect(result.errors).toEqual([])
    expect(result.ok).toBe(true)
  })

  it("tipos exactos, sin crash/perf, ProductInteraction unlinked, UserDefaults CA92.1", () => {
    const xml = fs.readFileSync(
      path.join(process.cwd(), "ios/App/App/PrivacyInfo.xcprivacy"),
      "utf8"
    )
    expect(xml).toMatch(/NSPrivacyTracking<\/key>\s*<false\s*\/>/)
    for (const t of EXPECTED_COLLECTED_TYPES) {
      expect(xml).toContain(t)
    }
    for (const t of FORBIDDEN_COLLECTED_TYPES) {
      expect(xml).not.toContain(t)
    }
    expect(xml).toContain("NSPrivacyAccessedAPICategoryUserDefaults")
    expect(xml).toContain("CA92.1")
    const pi =
      xml.match(
        /NSPrivacyCollectedDataTypeProductInteraction[\s\S]*?<\/dict>/
      )?.[0] || ""
    expect(pi).toMatch(/NSPrivacyCollectedDataTypeLinked<\/key>\s*<false\s*\/>/)
  })
})
