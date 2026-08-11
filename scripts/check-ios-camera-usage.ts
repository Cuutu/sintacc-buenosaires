#!/usr/bin/env tsx
/**
 * Guard: iOS target must ship a non-empty NSCameraUsageDescription.
 *
 * Why camera only (no NSPhotoLibrary* / NSMicrophone*):
 * - UI uses HTML <input type="file"> in Capacitor WKWebView (no @capacitor/camera).
 * - WebKit WKFileUploadPanel uses PHPicker for Photo Library (iOS 14+) — no library
 *   usage description required for one-shot pick.
 * - Camera path uses UIImagePickerController sourceType camera → requires
 *   NSCameraUsageDescription (Apple crash logs: TCC / SIGABRT without it).
 * - accept=image/* only; no video/audio capture → no microphone key.
 *
 * Source of truth: ios/App/App/Info.plist (INFOPLIST_FILE in project.pbxproj).
 * Localization: en.lproj + es.lproj InfoPlist.strings must also define the key.
 */

import fs from "fs"
import path from "path"

const ROOT = path.resolve(__dirname, "..")

const CAMERA_KEY = "NSCameraUsageDescription"
const FORBIDDEN_KEYS = [
  "NSPhotoLibraryUsageDescription",
  "NSPhotoLibraryAddUsageDescription",
  "NSMicrophoneUsageDescription",
] as const

export type CameraUsageCheckResult = {
  ok: boolean
  errors: string[]
}

function readText(filePath: string): string {
  return fs.readFileSync(filePath, "utf8")
}

function plistStringValue(plistXml: string, key: string): string | null {
  const re = new RegExp(
    `<key>${key}</key>\\s*<string>([\\s\\S]*?)</string>`,
    "m"
  )
  const match = plistXml.match(re)
  if (!match) return null
  return match[1].trim()
}

function stringsValue(contents: string, key: string): string | null {
  const re = new RegExp(
    `"${key}"\\s*=\\s*"((?:\\\\.|[^"\\\\])*)"\\s*;`,
    "m"
  )
  const match = contents.match(re)
  if (!match) return null
  return match[1].replace(/\\"/g, '"').trim()
}

export function checkIosCameraUsageDescription(
  rootDir: string = ROOT
): CameraUsageCheckResult {
  const errors: string[] = []
  const infoPlistPath = path.join(rootDir, "ios", "App", "App", "Info.plist")
  const pbxPath = path.join(
    rootDir,
    "ios",
    "App",
    "App.xcodeproj",
    "project.pbxproj"
  )
  const enPath = path.join(
    rootDir,
    "ios",
    "App",
    "App",
    "en.lproj",
    "InfoPlist.strings"
  )
  const esPath = path.join(
    rootDir,
    "ios",
    "App",
    "App",
    "es.lproj",
    "InfoPlist.strings"
  )

  if (!fs.existsSync(infoPlistPath)) {
    errors.push(`Missing Info.plist at ${infoPlistPath}`)
    return { ok: false, errors }
  }
  if (!fs.existsSync(pbxPath)) {
    errors.push(`Missing project.pbxproj at ${pbxPath}`)
    return { ok: false, errors }
  }

  const pbx = readText(pbxPath)
  const infoPlistRefs = [
    ...pbx.matchAll(/INFOPLIST_FILE\s*=\s*([^;]+);/g),
  ].map((m) => m[1].trim())
  if (infoPlistRefs.length === 0) {
    errors.push("project.pbxproj has no INFOPLIST_FILE setting")
  } else {
    for (const ref of infoPlistRefs) {
      if (ref !== "App/Info.plist") {
        errors.push(
          `INFOPLIST_FILE expected App/Info.plist, found ${ref}`
        )
      }
    }
  }

  if (!pbx.includes("InfoPlist.strings in Resources")) {
    errors.push(
      "InfoPlist.strings not listed in PBXResourcesBuildPhase (won't ship in .app)"
    )
  }
  if (!/\bes\b/.test(pbx.match(/knownRegions\s*=\s*\(([\s\S]*?)\);/)?.[1] || "")) {
    errors.push("knownRegions missing es (Spanish localization)")
  }

  const plist = readText(infoPlistPath)
  const camera = plistStringValue(plist, CAMERA_KEY)
  if (camera === null) {
    errors.push(`${CAMERA_KEY} missing from Info.plist`)
  } else if (!camera) {
    errors.push(`${CAMERA_KEY} is empty in Info.plist`)
  }

  for (const key of FORBIDDEN_KEYS) {
    if (plist.includes(`<key>${key}</key>`)) {
      errors.push(
        `Unexpected ${key} in Info.plist (Stage 1: do not add unused privacy keys)`
      )
    }
  }

  for (const [label, filePath] of [
    ["en", enPath],
    ["es", esPath],
  ] as const) {
    if (!fs.existsSync(filePath)) {
      errors.push(`Missing ${label} InfoPlist.strings at ${filePath}`)
      continue
    }
    const localized = stringsValue(readText(filePath), CAMERA_KEY)
    if (localized === null) {
      errors.push(`${CAMERA_KEY} missing from ${label} InfoPlist.strings`)
    } else if (!localized) {
      errors.push(`${CAMERA_KEY} empty in ${label} InfoPlist.strings`)
    }
  }

  return { ok: errors.length === 0, errors }
}

function main() {
  const result = checkIosCameraUsageDescription()
  if (!result.ok) {
    console.error("❌ iOS camera usage description guard failed:\n")
    for (const err of result.errors) {
      console.error(`  - ${err}`)
    }
    process.exit(1)
  }
  console.log(
    `✅ ${CAMERA_KEY} present (non-empty) in App/Info.plist + en/es InfoPlist.strings`
  )
  console.log("✅ INFOPLIST_FILE = App/Info.plist; no unused photo/mic keys")
}

if (require.main === module) {
  main()
}
