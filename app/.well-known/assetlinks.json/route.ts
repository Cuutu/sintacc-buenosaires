import { NextResponse } from "next/server"
import {
  buildAssetLinksBody,
  parseAndroidSha256Fingerprints,
} from "@/lib/android-assetlinks"

export const dynamic = "force-dynamic"

/**
 * Digital Asset Links for Android App Links.
 * Empty ANDROID_APP_SHA256_FINGERPRINTS → 404 (do not publish fake fingerprints).
 */
export async function GET() {
  const fingerprints = parseAndroidSha256Fingerprints()
  if (fingerprints.length === 0) {
    return new NextResponse("Not Found", { status: 404 })
  }

  return NextResponse.json(buildAssetLinksBody(fingerprints), {
    headers: {
      "Cache-Control": "public, max-age=300",
      "Content-Type": "application/json",
    },
  })
}
