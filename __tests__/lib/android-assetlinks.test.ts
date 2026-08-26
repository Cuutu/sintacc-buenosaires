import {
  ANDROID_ASSETLINKS_PACKAGE,
  buildAssetLinksBody,
  parseAndroidSha256Fingerprints,
} from "@/lib/android-assetlinks"

describe("android assetlinks", () => {
  it("vacío si no hay env", () => {
    expect(parseAndroidSha256Fingerprints("")).toEqual([])
    expect(parseAndroidSha256Fingerprints(undefined)).toEqual([])
  })

  it("rechaza fingerprints inventados / cortos", () => {
    expect(parseAndroidSha256Fingerprints("SHA256_FAKE")).toEqual([])
    expect(parseAndroidSha256Fingerprints("ABCD")).toEqual([])
  })

  it("normaliza hex 64 chars a colon format", () => {
    const hex = "A".repeat(64)
    const parsed = parseAndroidSha256Fingerprints(hex)
    expect(parsed).toHaveLength(1)
    expect(parsed[0]?.split(":").length).toBe(32)
  })

  it("arma body con package real", () => {
    const body = buildAssetLinksBody(["AA:BB"])
    expect(body[0]?.target.package_name).toBe(ANDROID_ASSETLINKS_PACKAGE)
    expect(body[0]?.target.sha256_cert_fingerprints).toEqual(["AA:BB"])
  })
})
