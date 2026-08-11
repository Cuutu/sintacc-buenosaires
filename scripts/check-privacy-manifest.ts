#!/usr/bin/env tsx
/**
 * Guard: PrivacyInfo.xcprivacy — exact Apple identifiers + no accidental tracking.
 */

import fs from "fs"
import path from "path"

const ROOT = path.resolve(__dirname, "..")

export const EXPECTED_COLLECTED_TYPES = [
  "NSPrivacyCollectedDataTypeName",
  "NSPrivacyCollectedDataTypeEmailAddress",
  "NSPrivacyCollectedDataTypeUserID",
  "NSPrivacyCollectedDataTypePreciseLocation",
  "NSPrivacyCollectedDataTypePhotosorVideos",
  "NSPrivacyCollectedDataTypeOtherUserContent",
  "NSPrivacyCollectedDataTypeProductInteraction",
] as const

export const FORBIDDEN_COLLECTED_TYPES = [
  "NSPrivacyCollectedDataTypeCrashData",
  "NSPrivacyCollectedDataTypePerformanceData",
] as const

export type PrivacyManifestCheckResult = {
  ok: boolean
  errors: string[]
}

function readText(filePath: string): string {
  return fs.readFileSync(filePath, "utf8")
}

function extractCollectedTypes(xml: string): string[] {
  const types: string[] = []
  const re =
    /<key>NSPrivacyCollectedDataType<\/key>\s*<string>([^<]+)<\/string>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(xml))) {
    types.push(m[1].trim())
  }
  return types
}

function productInteractionLinked(xml: string): boolean | null {
  const block =
    xml.match(
      /NSPrivacyCollectedDataTypeProductInteraction[\s\S]*?<\/dict>/
    )?.[0] || ""
  if (!block) return null
  if (/NSPrivacyCollectedDataTypeLinked<\/key>\s*<false\s*\/>/.test(block)) {
    return false
  }
  if (/NSPrivacyCollectedDataTypeLinked<\/key>\s*<true\s*\/>/.test(block)) {
    return true
  }
  return null
}

export function checkPrivacyManifest(
  rootDir: string = ROOT
): PrivacyManifestCheckResult {
  const errors: string[] = []
  const privacyPath = path.join(
    rootDir,
    "ios",
    "App",
    "App",
    "PrivacyInfo.xcprivacy"
  )
  const pbxPath = path.join(
    rootDir,
    "ios",
    "App",
    "App.xcodeproj",
    "project.pbxproj"
  )

  if (!fs.existsSync(privacyPath)) {
    errors.push("Missing ios/App/App/PrivacyInfo.xcprivacy")
    return { ok: false, errors }
  }

  const xml = readText(privacyPath)
  if (!xml.includes("<plist") || !xml.includes("</plist>")) {
    errors.push("PrivacyInfo.xcprivacy is not a valid plist wrapper")
  }
  if (!/<key>NSPrivacyTracking<\/key>\s*<false\s*\/>/.test(xml)) {
    errors.push("NSPrivacyTracking must be false")
  }
  if (!xml.includes("<key>NSPrivacyTrackingDomains</key>")) {
    errors.push("Missing NSPrivacyTrackingDomains")
  }
  if (!xml.includes("<key>NSPrivacyCollectedDataTypes</key>")) {
    errors.push("Missing NSPrivacyCollectedDataTypes")
  }
  if (!xml.includes("<key>NSPrivacyAccessedAPITypes</key>")) {
    errors.push("Missing NSPrivacyAccessedAPITypes")
  }

  const types = extractCollectedTypes(xml)
  for (const t of EXPECTED_COLLECTED_TYPES) {
    if (!types.includes(t)) errors.push(`Missing collected type: ${t}`)
  }
  for (const t of FORBIDDEN_COLLECTED_TYPES) {
    if (types.includes(t)) {
      errors.push(`Must not declare ${t} without device-side collection evidence`)
    }
  }

  const linked = productInteractionLinked(xml)
  if (linked !== false) {
    errors.push(
      "ProductInteraction must be linked=false (Vercel Analytics has no user id)"
    )
  }

  // App target does not call UserDefaults; third-party frameworks ship their own manifests.
  if (xml.includes("NSPrivacyAccessedAPICategoryUserDefaults")) {
    errors.push(
      "Do not declare UserDefaults Required Reason in app manifest (no App-target usage)"
    )
  }

  if (!fs.existsSync(pbxPath)) {
    errors.push("Missing project.pbxproj")
  } else {
    const pbx = readText(pbxPath)
    if (!pbx.includes("PrivacyInfo.xcprivacy in Resources")) {
      errors.push("PrivacyInfo.xcprivacy not in Copy Bundle Resources")
    }
  }

  return { ok: errors.length === 0, errors }
}

if (require.main === module) {
  const result = checkPrivacyManifest()
  if (!result.ok) {
    console.error("Privacy manifest check FAILED:")
    for (const e of result.errors) console.error(` - ${e}`)
    process.exit(1)
  }
  console.log("Privacy manifest check OK")
}
