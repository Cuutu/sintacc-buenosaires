import { PNG } from "pngjs"
import fs from "node:fs"
import path from "node:path"

type Size = { w: number; h: number }

const ROOT = process.cwd()
const PUBLIC_DIR = path.join(ROOT, "public")

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function writePngIfMissing(relPath: string, size: Size, draw: (png: PNG) => void) {
  const outPath = path.join(PUBLIC_DIR, relPath)
  if (fs.existsSync(outPath)) return

  const png = new PNG({ width: size.w, height: size.h })
  draw(png)
  ensureDir(path.dirname(outPath))
  fs.writeFileSync(outPath, PNG.sync.write(png))
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

function circle(png: PNG, cx: number, cy: number, radius: number, rgba: [number, number, number, number]) {
  const [r, g, b, a] = rgba
  const r2 = radius * radius
  const minX = Math.max(0, Math.floor(cx - radius))
  const maxX = Math.min(png.width - 1, Math.ceil(cx + radius))
  const minY = Math.max(0, Math.floor(cy - radius))
  const maxY = Math.min(png.height - 1, Math.ceil(cy + radius))

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = x - cx
      const dy = y - cy
      if (dx * dx + dy * dy <= r2) {
        const idx = (png.width * y + x) << 2
        png.data[idx] = r
        png.data[idx + 1] = g
        png.data[idx + 2] = b
        png.data[idx + 3] = a
      }
    }
  }
}

function roundedRect(
  png: PNG,
  x0: number,
  y0: number,
  w: number,
  h: number,
  radius: number,
  rgba: [number, number, number, number],
) {
  const [r, g, b, a] = rgba
  const r2 = radius * radius
  const x1 = x0 + w - 1
  const y1 = y0 + h - 1

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      let ok = true
      const dxL = x - x0
      const dxR = x1 - x
      const dyT = y - y0
      const dyB = y1 - y

      if (dxL < radius && dyT < radius) ok = dxL * dxL + dyT * dyT <= r2
      else if (dxR < radius && dyT < radius) ok = dxR * dxR + dyT * dyT <= r2
      else if (dxL < radius && dyB < radius) ok = dxL * dxL + dyB * dyB <= r2
      else if (dxR < radius && dyB < radius) ok = dxR * dxR + dyB * dyB <= r2

      if (ok) {
        const idx = (png.width * y + x) << 2
        png.data[idx] = r
        png.data[idx + 1] = g
        png.data[idx + 2] = b
        png.data[idx + 3] = a
      }
    }
  }
}

function drawIcon(png: PNG, opts: { maskable: boolean }) {
  // Dark background + simple mark. Placeholder until real brand assets exist.
  fill(png, [11, 18, 32, 255]) // #0b1220

  const pad = opts.maskable ? Math.floor(Math.min(png.width, png.height) * 0.12) : Math.floor(Math.min(png.width, png.height) * 0.08)
  const boxW = png.width - pad * 2
  const boxH = png.height - pad * 2
  const radius = Math.floor(Math.min(boxW, boxH) * 0.22)

  roundedRect(png, pad, pad, boxW, boxH, radius, [34, 197, 94, 255]) // green

  const cx = Math.floor(png.width / 2)
  const cy = Math.floor(png.height / 2)
  const dotR = Math.floor(Math.min(png.width, png.height) * 0.09)
  circle(png, cx, cy, dotR, [255, 255, 255, 255])
}

function drawOg(png: PNG) {
  fill(png, [11, 18, 32, 255])
  // big soft circle
  const cx = Math.floor(png.width * 0.25)
  const cy = Math.floor(png.height * 0.55)
  circle(png, cx, cy, Math.floor(png.height * 0.32), [34, 197, 94, 255])
  circle(png, cx, cy, Math.floor(png.height * 0.18), [255, 255, 255, 255])
  // right card
  const x = Math.floor(png.width * 0.48)
  const y = Math.floor(png.height * 0.22)
  const w = Math.floor(png.width * 0.44)
  const h = Math.floor(png.height * 0.56)
  roundedRect(png, x, y, w, h, Math.floor(png.height * 0.06), [17, 24, 39, 255])
  roundedRect(png, x + 26, y + 26, Math.floor(w * 0.72), 18, 9, [255, 255, 255, 220])
  roundedRect(png, x + 26, y + 62, Math.floor(w * 0.52), 18, 9, [255, 255, 255, 160])
  roundedRect(png, x + 26, y + 98, Math.floor(w * 0.60), 18, 9, [255, 255, 255, 160])
}

ensureDir(PUBLIC_DIR)

writePngIfMissing("icon-192.png", { w: 192, h: 192 }, (png) => drawIcon(png, { maskable: false }))
writePngIfMissing("icon-512.png", { w: 512, h: 512 }, (png) => drawIcon(png, { maskable: false }))
writePngIfMissing("maskable-512.png", { w: 512, h: 512 }, (png) => drawIcon(png, { maskable: true }))
writePngIfMissing("CelimapLOGO.png", { w: 512, h: 512 }, (png) => drawIcon(png, { maskable: false }))
writePngIfMissing("og.png", { w: 1200, h: 630 }, (png) => drawOg(png))

console.log("[pwa] assets ok:", ["icon-192.png", "icon-512.png", "maskable-512.png", "CelimapLOGO.png", "og.png"].join(", "))

