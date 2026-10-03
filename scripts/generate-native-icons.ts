import { PNG } from "pngjs"
import sharp from "sharp"
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const BRAND_ICON = path.join(ROOT, "public/brand/app-icon.png")
const ANDROID_RES = path.join(ROOT, "android/app/src/main/res")
const IOS_ASSETS = path.join(ROOT, "ios/App/App/Assets.xcassets/AppIcon.appiconset")
const TEMP_DIR = path.join(ROOT, ".tmp-icons")

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
  // Pin should be 58-60dp of 108dp canvas to fit well in 66dp safe circle
  // That's ~54-55.5% of the canvas
  const pinHeightRatio = 0.545 // 58.86dp / 108dp
  const pinTargetHeight = Math.round(outSize * pinHeightRatio)

  const out = new PNG({ width: outSize, height: outSize })
  // Initialize transparent
  fill(out, [0, 0, 0, 0])

  // Calculate aspect ratio and target dimensions
  const aspectRatio = srcIcon.width / srcIcon.height
  const pinTargetWidth = Math.round(pinTargetHeight * aspectRatio)

  // Resize pin to target size
  const scaled = resize(srcIcon, pinTargetWidth, pinTargetHeight)

  // Center the pin in the canvas
  const offsetX = Math.round((outSize - pinTargetWidth) / 2)
  const offsetY = Math.round((outSize - pinTargetHeight) / 2)

  // Blit scaled icon into center
  for (let y = 0; y < scaled.height && y + offsetY < out.height; y++) {
    for (let x = 0; x < scaled.width && x + offsetX < out.width; x++) {
      const si = (scaled.width * y + x) << 2
      const oi = (out.width * (y + offsetY) + (x + offsetX)) << 2
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

/**
 * Extract cream pin from app-icon.png by cropping to pin bounding box.
 * Avoids anti-aliased rounded-square edges by detecting cream pin bbox and cropping.
 * Returns path to cropped pin PNG.
 */
async function extractCreamPinFromAppIcon(): Promise<string> {
  ensureDir(TEMP_DIR)
  const outputPath = path.join(TEMP_DIR, "cream-pin-cropped.png")

  // Find bounding box of cream pin (cream color: R > 220, G > 220, B > 200)
  const { data, info } = await sharp(BRAND_ICON)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height, channels } = info
  let minX = width
  let minY = height
  let maxX = 0
  let maxY = 0
  let creamPixelCount = 0

  // Detect cream pixels (high RGB values, excluding dark green and orange)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]

      // Cream pin: R > 230, G > 230, B > 220 (very restrictive, only pure cream)
      const isCream = r > 230 && g > 230 && b > 220

      if (isCream) {
        creamPixelCount++
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    }
  }

  console.log(`[extract] Found ${creamPixelCount} cream pixels`)

  if (creamPixelCount === 0) {
    throw new Error("No cream pixels found in app-icon.png")
  }

  // Add 2% padding to bbox
  const bboxW = maxX - minX + 1
  const bboxH = maxY - minY + 1
  const paddingX = Math.max(1, Math.round(bboxW * 0.02))
  const paddingY = Math.max(1, Math.round(bboxH * 0.02))

  const cropX = Math.max(0, minX - paddingX)
  const cropY = Math.max(0, minY - paddingY)
  const cropW = Math.min(width - cropX, bboxW + paddingX * 2)
  const cropH = Math.min(height - cropY, bboxH + paddingY * 2)

  console.log(
    `[extract] Cream pin bbox: (${minX},${minY}) to (${maxX},${maxY}), size ${bboxW}x${bboxH}`,
  )
  console.log(`[extract] Crop with 2% padding: (${cropX},${cropY}) ${cropW}x${cropH}`)

  // Crop app-icon.png to bbox
  // This crop is inside the rounded square, so no anti-aliased edges
  // Green pixels inside are same #2D4A34 as background, invisible when composited
  await sharp(BRAND_ICON).extract({ left: cropX, top: cropY, width: cropW, height: cropH }).toFile(outputPath)

  console.log(`[extract] Cream pin cropped to ${outputPath}`)
  return outputPath
}

console.log(`[native-icons] Source: ${BRAND_ICON}`)

// Main execution wrapped in async function
;(async () => {
  // Step 1: Extract cream pin from app-icon.png
  console.log("[native-icons] Extracting cream pin from app-icon.png...")
  const creamPinPath = await extractCreamPinFromAppIcon()

  // Load the extracted cream pin
  const creamPinPng = PNG.sync.read(fs.readFileSync(creamPinPath))
  console.log(`[native-icons] Cream pin: ${creamPinPng.width}x${creamPinPng.height}`)

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

  console.log("[native-icons] Generating Android legacy icons...")

  for (const { density, size } of androidSizes) {
    const dir = path.join(ANDROID_RES, `mipmap-${density}`)
    ensureDir(dir)

    // Legacy icon: cream pin composited over dark green (no transparency)
    const resized = resize(creamPinPng, size, size)
    const composite = compositeOverBackground(resized, DARK_GREEN_BG)
    fs.writeFileSync(path.join(dir, "ic_launcher.png"), PNG.sync.write(composite))

    // Round icon: apply circular mask to the composited icon
    const mask = createCircleMask(size)
    const roundIcon = applyMask(composite, mask)
    fs.writeFileSync(path.join(dir, "ic_launcher_round.png"), PNG.sync.write(roundIcon))

    console.log(`  ✓ mipmap-${density}: ic_launcher.png, ic_launcher_round.png (${size}x${size})`)
  }

  console.log("[native-icons] Generating Android adaptive icons...")

  // Adaptive icon layers: use cream pin for foreground
  for (const { density, size } of adaptiveSizes) {
    const dir = path.join(ANDROID_RES, `mipmap-${density}`)
    ensureDir(dir)

    // Foreground: cream pin in safe zone on transparent
    const foreground = createAdaptiveForeground(creamPinPng, size)
    fs.writeFileSync(path.join(dir, "ic_launcher_foreground.png"), PNG.sync.write(foreground))

    // Background: solid dark green
    const background = new PNG({ width: size, height: size })
    fill(background, DARK_GREEN_BG)
    fs.writeFileSync(path.join(dir, "ic_launcher_background.png"), PNG.sync.write(background))

    // Monochrome: grayscale for Android 13 themed icons
    const monochrome = createMonochrome(creamPinPng, size)
    fs.writeFileSync(path.join(dir, "ic_launcher_monochrome.png"), PNG.sync.write(monochrome))

    console.log(`  ✓ mipmap-${density}: adaptive (foreground + background + monochrome, ${size}x${size})`)
  }

  // Generate preview composite for verification
  console.log("[native-icons] Generating preview composite (hdpi, 162x162)...")
  const previewSize = 162
  const previewFg = createAdaptiveForeground(creamPinPng, previewSize)
  const previewBg = new PNG({ width: previewSize, height: previewSize })
  fill(previewBg, DARK_GREEN_BG)
  const previewComposite = compositeOverBackground(previewFg, DARK_GREEN_BG)
  const previewMask = createCircleMask(previewSize)
  const previewCircle = applyMask(previewComposite, previewMask)
  const previewPath = path.join(TEMP_DIR, "android-adaptive-preview-circle.png")
  fs.writeFileSync(previewPath, PNG.sync.write(previewCircle))
  console.log(`  ✓ Preview: ${previewPath}`)

  // iOS AppIcon: solid green canvas + cream pin composited on top
  console.log("[native-icons] Generating iOS icon...")
  ensureDir(IOS_ASSETS)

  const iosSize = 1024
  const iosPath = path.join(IOS_ASSETS, "AppIcon-512@2x.png")

  // Pin height should be 62-65% of canvas to match icon-512.png proportions
  const pinHeightRatio = 0.635 // ~63.5% of canvas
  const pinTargetHeight = Math.round(iosSize * pinHeightRatio) // ~650px

  // Resize cream pin to target height, maintaining aspect ratio
  const pinResized = await sharp(creamPinPath)
    .resize({ height: pinTargetHeight, fit: "contain" })
    .toBuffer()

  // Create solid dark green canvas and composite pin centered
  await sharp({
    create: {
      width: iosSize,
      height: iosSize,
      channels: 3,
      background: { r: 45, g: 74, b: 52 },
    },
  })
    .composite([
      {
        input: pinResized,
        gravity: "center",
      },
    ])
    .flatten({ background: { r: 45, g: 74, b: 52 } })
    .removeAlpha()
    .png({ compressionLevel: 9, force: true })
    .toFile(iosPath)

  // Verify
  const iosStats = fs.statSync(iosPath)
  console.log(
    `  ✓ AppIcon-512@2x.png (${iosSize}x${iosSize}, pin height ${pinTargetHeight}px = ${(pinHeightRatio * 100).toFixed(1)}%, ${(iosStats.size / 1024).toFixed(1)} KB)`,
  )

  // Cleanup temp files
  if (fs.existsSync(TEMP_DIR)) {
    const tempFiles = fs.readdirSync(TEMP_DIR)
    console.log(`[native-icons] Temp files in ${TEMP_DIR}: ${tempFiles.join(", ")}`)
  }

  console.log("[native-icons] ✨ Done!")
  console.log()
  console.log("Android adaptive: cream pin foreground on dark green background")
  console.log("iOS: solid dark green canvas + cream pin composited (RGB, no alpha)")
  console.log(`Preview: ${previewPath}`)
})()
