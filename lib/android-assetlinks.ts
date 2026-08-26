export const ANDROID_ASSETLINKS_PACKAGE = "com.celimap.app"

/** Comma-separated SHA-256 fingerprints from env. Empty → do not publish assetlinks. */
export function parseAndroidSha256Fingerprints(
  raw: string | undefined = process.env.ANDROID_APP_SHA256_FINGERPRINTS
): string[] {
  if (!raw?.trim()) return []
  return [
    ...new Set(
      raw
        .split(",")
        .map((part) => part.trim().replace(/:/g, "").toUpperCase())
        .filter((part) => /^[A-F0-9]{64}$/.test(part))
        .map((hex) => hex.match(/.{2}/g)?.join(":") ?? hex)
    ),
  ]
}

export function buildAssetLinksBody(fingerprints: string[]) {
  return [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: ANDROID_ASSETLINKS_PACKAGE,
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ]
}
