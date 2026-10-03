import sharp from "sharp"
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const MASTERS = path.join(ROOT, "assets/native-icons")
const ANDROID_RES = path.join(ROOT, "android/app/src/main/res")
const IOS_ASSETS = path.join(ROOT, "ios/App/App/Assets.xcassets/AppIcon.appiconset")

// Master assets (verified, clean)
const IOS_MASTER = path.join(MASTERS, "ios-appicon-1024_9188.png")
const ANDROID_FG_MASTER = path.join(MASTERS, "android-foreground-432_c319.png")
const ANDROID_MONO_MASTER = path.join(MASTERS, "android-monochrome-432_02c0.png")
const ANDROID_BG_MASTER = path.join(MASTERS, "android-background-432_bf93.png")
const ANDROID_LEGACY_MASTER = path.join(MASTERS, "android-legacy-512_56f5.png")
const ANDROID_ROUND_MASTER = path.join(MASTERS, "android-legacy-round-512_7012.png")

// Densities and sizes
const adaptiveSizes = [
  { density: "ldpi", size: 81 },
  { density: "mdpi", size: 108 },
  { density: "hdpi", size: 162 },
  { density: "xhdpi", size: 216 },
  { density: "xxhdpi", size: 324 },
  { density: "xxxhdpi", size: 432 },
]

const legacySizes = [
  { density: "ldpi", size: 36 },
  { density: "mdpi", size: 48 },
  { density: "hdpi", size: 72 },
  { density: "xhdpi", size: 96 },
  { density: "xxhdpi", size: 144 },
  { density: "xxxhdpi", size: 192 },
]

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

;(async () => {
  console.log("[native-icons] Using verified master assets from assets/native-icons/")

  // iOS AppIcon: use master as-is
  console.log("[native-icons] iOS AppIcon...")
  ensureDir(IOS_ASSETS)
  await fs.promises.copyFile(IOS_MASTER, path.join(IOS_ASSETS, "AppIcon-512@2x.png"))
  console.log("  ✓ AppIcon-512@2x.png (1024x1024, copied from master)")

  // Android adaptive icons
  console.log("[native-icons] Android adaptive icons...")
  for (const { density, size } of adaptiveSizes) {
    const dir = path.join(ANDROID_RES, `mipmap-${density}`)
    ensureDir(dir)

    // Foreground: resize with Lanczos3 (high quality)
    await sharp(ANDROID_FG_MASTER)
      .resize(size, size, { kernel: "lanczos3" })
      .toFile(path.join(dir, "ic_launcher_foreground.png"))

    // Monochrome: resize with Lanczos3
    await sharp(ANDROID_MONO_MASTER)
      .resize(size, size, { kernel: "lanczos3" })
      .toFile(path.join(dir, "ic_launcher_monochrome.png"))

    // Background: resize (solid color, kernel doesn't matter much)
    await sharp(ANDROID_BG_MASTER)
      .resize(size, size, { kernel: "lanczos3" })
      .toFile(path.join(dir, "ic_launcher_background.png"))

    console.log(`  ✓ mipmap-${density}: adaptive (${size}x${size})`)
  }

  // Android legacy icons
  console.log("[native-icons] Android legacy icons...")
  for (const { density, size } of legacySizes) {
    const dir = path.join(ANDROID_RES, `mipmap-${density}`)
    ensureDir(dir)

    // ic_launcher.png (rounded square)
    await sharp(ANDROID_LEGACY_MASTER)
      .resize(size, size, { kernel: "lanczos3" })
      .toFile(path.join(dir, "ic_launcher.png"))

    // ic_launcher_round.png (circle)
    await sharp(ANDROID_ROUND_MASTER)
      .resize(size, size, { kernel: "lanczos3" })
      .toFile(path.join(dir, "ic_launcher_round.png"))

    console.log(`  ✓ mipmap-${density}: legacy (${size}x${size})`)
  }

  console.log("[native-icons] ✨ Done!")
  console.log()
  console.log("Master assets:")
  console.log(`  iOS: ${path.basename(IOS_MASTER)}`)
  console.log(`  Android FG: ${path.basename(ANDROID_FG_MASTER)} (432x432)`)
  console.log(`  Android Mono: ${path.basename(ANDROID_MONO_MASTER)} (432x432)`)
  console.log(`  Android BG: ${path.basename(ANDROID_BG_MASTER)} (432x432, #2B442C)`)
  console.log(`  Android Legacy: ${path.basename(ANDROID_LEGACY_MASTER)} (512x512)`)
  console.log(`  Android Round: ${path.basename(ANDROID_ROUND_MASTER)} (512x512)`)
})()
