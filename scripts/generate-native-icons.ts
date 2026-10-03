import { PNG } from "pngjs"
import sharp from "sharp"
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const BRAND_ICON = path.join(ROOT, "public/brand/app-icon.png")
const MARK_PIN = path.join(ROOT, "public/brand/mark.png") // Pin shape with wheat
const ANDROID_RES = path.join(ROOT, "android/app/src/main/res")
const IOS_ASSETS = path.join(ROOT, "ios/App/App/Assets.xcassets/AppIcon.appiconset")

const DARK_GREEN_BG: [number, number, number, number] = [45, 74, 52, 255] // #2D4A34
const CREAM_FG: [number, number, number, number] = [247, 243, 235, 255] // #F7F3EB (for monochrome)

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

/** Composite src (RGBA) over opaque background, returns RGBA */
function compositeOverBackground(src: PNG, bgRgba: [number, number, number, number]): PNG {
  const out = new PNG({ width: src.width, height: src.height })
  const [bgR, bgG, bgB] = bgRgba
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const idx = (src.width * y + x) << 2
      const sr = src.data[idx]
      const sg = src.data[idx + 1]
      const sb = src.data[idx + 2]
      const sa = src.data[idx + 3] / 255
      out.data[idx] = Math.round(sr * sa + bgR * (1 - sa))
      out.data[idx + 1] = Math.round(sg * sa + bgG * (1 - sa))
      out.data[idx + 2] = Math.round(sb * sa + bgB * (1 - sa))
      out.data[idx + 3] = 255 // Fully opaque
    }
  }
  return out
}

/** Strip alpha channel, save as RGB PNG (iOS requirement) */
// NOTE: This function is kept for reference but not used.
// Sharp is used instead for iOS icon generation (more reliable RGB output).
function stripAlphaToRgb(png: PNG): Buffer {
  // Create RGB PNG (colorType 2 = RGB, 3 bytes per pixel)
  const width = png.width
  const height = png.height
  const rgbPng = new PNG({
    width,
    height,
    colorType: 2, // RGB
    inputColorType: 2,
    inputHasAlpha: false,
  })
  
  // Allocate buffer: width * height * 3 bytes (RGB, no alpha)
  rgbPng.data = Buffer.alloc(width * height * 3)
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const rgbaIdx = (width * y + x) << 2 // Source: RGBA (4 bytes)
      const rgbIdx = (width * y + x) * 3   // Target: RGB (3 bytes)
      
      rgbPng.data[rgbIdx] = png.data[rgbaIdx]         // R
      rgbPng.data[rgbIdx + 1] = png.data[rgbaIdx + 1] // G
      rgbPng.data[rgbIdx + 2] = png.data[rgbaIdx + 2] // B
      // Skip alpha (rgbaIdx + 3)
    }
  }
  
  return PNG.sync.write(rgbPng)
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

/** Android adaptive icon: center srcIcon in 108dp canvas with safe zone padding */
function createAdaptiveForeground(srcIcon: PNG, outSize: number): PNG {
  // Adaptive icon: 108dp canvas, 66dp safe zone = 61.1% of canvas
  // Safe zone starts at 21dp inset = 19.4% inset
  const safeZoneRatio = 66 / 108 // ~0.611
  const insetRatio = (108 - 66) / 2 / 108 // ~0.194

  const out = new PNG({ width: outSize, height: outSize })
  // Initialize transparent
  fill(out, [0, 0, 0, 0])

  const safeSize = Math.round(outSize * safeZoneRatio)
  const offset = Math.round(outSize * insetRatio)

  const scaled = resize(srcIcon, safeSize, safeSize)

  // Blit scaled icon into center
  for (let y = 0; y < scaled.height && y + offset < out.height; y++) {
    for (let x = 0; x < scaled.width && x + offset < out.width; x++) {
      const si = (scaled.width * y + x) << 2
      const oi = (out.width * (y + offset) + (x + offset)) << 2
      out.data[oi] = scaled.data[si]
      out.data[oi + 1] = scaled.data[si + 1]
      out.data[oi + 2] = scaled.data[si + 2]
      out.data[oi + 3] = scaled.data[si + 3]
    }
  }

  return out
}

/** Monochrome: grayscale of the icon on transparent (Android 13 themed icons) */
function createMonochrome(src: PNG, outSize: number): PNG {
  const resized = createAdaptiveForeground(src, outSize)
  const mono = new PNG({ width: outSize, height: outSize })
  
  for (let y = 0; y < outSize; y++) {
    for (let x = 0; x < outSize; x++) {
      const idx = (outSize * y + x) << 2
      const r = resized.data[idx]
      const g = resized.data[idx + 1]
      const b = resized.data[idx + 2]
      const a = resized.data[idx + 3]
      
      // Convert to grayscale (luminance formula)
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
      
      mono.data[idx] = gray
      mono.data[idx + 1] = gray
      mono.data[idx + 2] = gray
      mono.data[idx + 3] = a
    }
  }
  
  return mono
}

const brandIcon = PNG.sync.read(fs.readFileSync(BRAND_ICON))
console.log(`[native-icons] Brand icon: ${BRAND_ICON} (${brandIcon.width}x${brandIcon.height})`)

// For adaptive foreground, try mark.png (pin shape) if available, else use brandIcon
let adaptiveForegroundSource = brandIcon
if (fs.existsSync(MARK_PIN)) {
  adaptiveForegroundSource = PNG.sync.read(fs.readFileSync(MARK_PIN))
  console.log(
    `[native-icons] Adaptive foreground: ${MARK_PIN} (${adaptiveForegroundSource.width}x${adaptiveForegroundSource.height})`,
  )
} else {
  console.log("[native-icons] Adaptive foreground: using brand icon (mark.png not found)")
}

// Main execution wrapped in async function
;(async () => {
  // Android mipmap densities for legacy icons
  const androidSizes = [
    { density: "ldpi", size: 36 },
    { density: "mdpi", size: 48 },
    { density: "hdpi", size: 72 },
    { density: "xhdpi", size: 96 },
    { density: "xxhdpi", size: 144 },
    { density: "xxxhdpi", size: 192 },
  ]

  // Android adaptive icon canvas sizes (108dp at various densities)
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

    // Legacy icon: brand icon composited over dark green (no transparency)
    const resized = resize(brandIcon, size, size)
    const composite = compositeOverBackground(resized, DARK_GREEN_BG)
    fs.writeFileSync(path.join(dir, "ic_launcher.png"), PNG.sync.write(composite))

    // Round icon: apply circular mask to the composited icon
    const mask = createCircleMask(size)
    const roundIcon = applyMask(composite, mask)
    fs.writeFileSync(path.join(dir, "ic_launcher_round.png"), PNG.sync.write(roundIcon))

    console.log(`  ✓ mipmap-${density}: ic_launcher.png, ic_launcher_round.png (${size}x${size})`)
  }

  // Adaptive icon layers (foreground + background + monochrome)
  for (const { density, size } of adaptiveSizes) {
    const dir = path.join(ANDROID_RES, `mipmap-${density}`)
    ensureDir(dir)

    // Foreground: pin+wheat in safe zone on transparent
    const foreground = createAdaptiveForeground(adaptiveForegroundSource, size)
    fs.writeFileSync(path.join(dir, "ic_launcher_foreground.png"), PNG.sync.write(foreground))

    // Background: solid dark green
    const background = new PNG({ width: size, height: size })
    fill(background, DARK_GREEN_BG)
    fs.writeFileSync(path.join(dir, "ic_launcher_background.png"), PNG.sync.write(background))

    // Monochrome: grayscale for Android 13 themed icons (optional but recommended)
    const monochrome = createMonochrome(adaptiveForegroundSource, size)
    fs.writeFileSync(path.join(dir, "ic_launcher_monochrome.png"), PNG.sync.write(monochrome))

    console.log(`  ✓ mipmap-${density}: adaptive (foreground + background + monochrome, ${size}x${size})`)
  }

  // iOS AppIcon: full-bleed square, RGB (no alpha channel), dark green to edges
  console.log("[native-icons] Generating iOS icon...")
  ensureDir(IOS_ASSETS)

  const iosSize = 1024
  const iosPath = path.join(IOS_ASSETS, "AppIcon-512@2x.png")

  // Use sharp to resize, flatten alpha over dark green background, and ensure RGB output
  await sharp(BRAND_ICON)
    .resize(iosSize, iosSize, { fit: "fill" })
    .flatten({ background: { r: 45, g: 74, b: 52 } }) // Flatten alpha over dark green
    .removeAlpha() // Explicitly remove alpha channel
    .toColorspace("srgb")
    .png({ compressionLevel: 9, palette: false, force: true })
    .toFile(iosPath)

  // Verify the generated file
  const iosStats = fs.statSync(iosPath)
  console.log(`  ✓ AppIcon-512@2x.png (${iosSize}x${iosSize}, ${(iosStats.size / 1024).toFixed(1)} KB)`)

  console.log("[native-icons] ✨ Done!")
  console.log()
  console.log("Android adaptive icon: foreground uses safe zone (66dp of 108dp canvas)")
  console.log("iOS icon: RGB (no alpha), full-bleed square, dark green corners")
  console.log("Android monochrome layer: generated for Android 13+ themed icons")
})()
