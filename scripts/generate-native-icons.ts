import { PNG } from "pngjs"
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const BRAND_ICON = path.join(ROOT, "public/brand/app-icon.png")
const ANDROID_RES = path.join(ROOT, "android/app/src/main/res")
const IOS_ASSETS = path.join(ROOT, "ios/App/App/Assets.xcassets/AppIcon.appiconset")

const DARK_GREEN_BG: [number, number, number, number] = [45, 74, 52, 255] // #2D4A34

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function fill(png: PNG, rgba: [number, number, number, number]) {
  const [r, g, b, a] = rgba
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const idx = (png.width * y + x) << 2
      png.data[idx] = r
      png.data[idx + 1] = g
      png.data[idx + 2] = b
      png.data[idx + 3] = a
    }
  }
}

function sampleBilinear(src: PNG, fx: number, fy: number): [number, number, number, number] {
  const x0 = Math.max(0, Math.min(src.width - 1, Math.floor(fx)))
  const y0 = Math.max(0, Math.min(src.height - 1, Math.floor(fy)))
  const x1 = Math.max(0, Math.min(src.width - 1, x0 + 1))
  const y1 = Math.max(0, Math.min(src.height - 1, y0 + 1))
  const tx = Math.max(0, Math.min(1, fx - Math.floor(fx)))
  const ty = Math.max(0, Math.min(1, fy - Math.floor(fy)))
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t
  const at = (x: number, y: number) => {
    const i = (src.width * y + x) << 2
    return [src.data[i], src.data[i + 1], src.data[i + 2], src.data[i + 3]] as const
  }
  const c00 = at(x0, y0)
  const c10 = at(x1, y0)
  const c01 = at(x0, y1)
  const c11 = at(x1, y1)
  const r = lerp(lerp(c00[0], c10[0], tx), lerp(c01[0], c11[0], tx), ty)
  const g = lerp(lerp(c00[1], c10[1], tx), lerp(c01[1], c11[1], tx), ty)
  const b = lerp(lerp(c00[2], c10[2], tx), lerp(c01[2], c11[2], tx), ty)
  const a = lerp(lerp(c00[3], c10[3], tx), lerp(c01[3], c11[3], tx), ty)
  return [Math.round(r), Math.round(g), Math.round(b), Math.round(a)]
}

function resize(src: PNG, outW: number, outH: number): PNG {
  const out = new PNG({ width: outW, height: outH })
  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      const fx = (x / (outW - 1 || 1)) * (src.width - 1)
      const fy = (y / (outH - 1 || 1)) * (src.height - 1)
      const [r, g, b, a] = sampleBilinear(src, fx, fy)
      const oi = (outW * y + x) << 2
      out.data[oi] = r
      out.data[oi + 1] = g
      out.data[oi + 2] = b
      out.data[oi + 3] = a
    }
  }
  return out
}

function createCircleMask(size: number): PNG {
  const png = new PNG({ width: size, height: size })
  const cx = size / 2
  const cy = size / 2
  const r = size / 2
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx + 0.5
      const dy = y - cy + 0.5
      const dist = Math.sqrt(dx * dx + dy * dy)
      const idx = (size * y + x) << 2
      png.data[idx] = 0
      png.data[idx + 1] = 0
      png.data[idx + 2] = 0
      png.data[idx + 3] = dist <= r ? 255 : 0
    }
  }
  return png
}

function applyMask(src: PNG, mask: PNG): PNG {
  const out = new PNG({ width: src.width, height: src.height })
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const idx = (src.width * y + x) << 2
      out.data[idx] = src.data[idx]
      out.data[idx + 1] = src.data[idx + 1]
      out.data[idx + 2] = src.data[idx + 2]
      out.data[idx + 3] = mask.data[idx + 3]
    }
  }
  return out
}

const source = PNG.sync.read(fs.readFileSync(BRAND_ICON))
console.log(`[native-icons] Source: ${BRAND_ICON} (${source.width}x${source.height})`)

// Android mipmap densities
const androidSizes = [
  { density: "ldpi", size: 36 },
  { density: "mdpi", size: 48 },
  { density: "hdpi", size: 72 },
  { density: "xhdpi", size: 96 },
  { density: "xxhdpi", size: 144 },
  { density: "xxxhdpi", size: 192 },
]

// Android adaptive icon foreground (108dp with 66dp safe zone = needs padding)
// Capacitor expects 432x432 foreground for adaptive icons
const adaptiveSizes = [
  { density: "ldpi", size: 81 },
  { density: "mdpi", size: 108 },
  { density: "hdpi", size: 162 },
  { density: "xhdpi", size: 216 },
  { density: "xxhdpi", size: 324 },
  { density: "xxxhdpi", size: 432 },
]

console.log("[native-icons] Generating Android icons...")

for (const { density, size } of androidSizes) {
  const dir = path.join(ANDROID_RES, `mipmap-${density}`)
  ensureDir(dir)

  // Legacy icon (rounded square design as-is)
  const icon = resize(source, size, size)
  fs.writeFileSync(path.join(dir, "ic_launcher.png"), PNG.sync.write(icon))

  // Round icon (apply circular mask)
  const mask = createCircleMask(size)
  const roundIcon = applyMask(icon, mask)
  fs.writeFileSync(path.join(dir, "ic_launcher_round.png"), PNG.sync.write(roundIcon))

  console.log(`  ✓ mipmap-${density}: ic_launcher.png, ic_launcher_round.png (${size}x${size})`)
}

// Adaptive icon foreground (use full design, Android will apply its own mask)
for (const { density, size } of adaptiveSizes) {
  const dir = path.join(ANDROID_RES, `mipmap-${density}`)
  ensureDir(dir)

  const foreground = resize(source, size, size)
  fs.writeFileSync(path.join(dir, "ic_launcher_foreground.png"), PNG.sync.write(foreground))

  // Background: solid dark green
  const background = new PNG({ width: size, height: size })
  fill(background, DARK_GREEN_BG)
  fs.writeFileSync(path.join(dir, "ic_launcher_background.png"), PNG.sync.write(background))

  console.log(`  ✓ mipmap-${density}: adaptive icon (${size}x${size})`)
}

// iOS AppIcon (1024x1024 for App Store)
console.log("[native-icons] Generating iOS icon...")
ensureDir(IOS_ASSETS)
const iosIcon = resize(source, 1024, 1024)
fs.writeFileSync(path.join(IOS_ASSETS, "AppIcon-512@2x.png"), PNG.sync.write(iosIcon))
console.log(`  ✓ AppIcon-512@2x.png (1024x1024)`)

console.log("[native-icons] ✨ Done!")
