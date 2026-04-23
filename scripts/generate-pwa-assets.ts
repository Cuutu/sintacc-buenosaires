import { PNG } from "pngjs"
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const PUBLIC_DIR = path.join(ROOT, "public")
const LOGO_REL = "CelimapLOGO.png"
const LOGO_PATH = path.join(PUBLIC_DIR, LOGO_REL)

/** Fondo maskable / theme, alineado con manifest */
const MASK_BG: [number, number, number, number] = [11, 18, 32, 255]

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function writePng(relPath: string, png: PNG) {
  const outPath = path.join(PUBLIC_DIR, relPath)
  ensureDir(path.dirname(outPath))
  fs.writeFileSync(outPath, PNG.sync.write(png))
}

function writePngIfMissing(relPath: string, width: number, height: number, draw: (png: PNG) => void) {
  const outPath = path.join(PUBLIC_DIR, relPath)
  if (fs.existsSync(outPath)) return
  const png = new PNG({ width, height })
  draw(png)
  writePng(relPath, png)
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

/** Placeholder solo si no hay `CelimapLOGO.png` en repo / CI */
function drawPlaceholderLogo(png: PNG) {
  fill(png, [11, 18, 32, 255])
  const pad = Math.floor(Math.min(png.width, png.height) * 0.08)
  const boxW = png.width - pad * 2
  const boxH = png.height - pad * 2
  const radius = Math.floor(Math.min(boxW, boxH) * 0.22)
  roundedRect(png, pad, pad, boxW, boxH, radius, [34, 197, 94, 255])
  const cx = Math.floor(png.width / 2)
  const cy = Math.floor(png.height / 2)
  const dotR = Math.floor(Math.min(png.width, png.height) * 0.09)
  circle(png, cx, cy, dotR, [255, 255, 255, 255])
}

function drawOg(png: PNG) {
  fill(png, [11, 18, 32, 255])
  const cx = Math.floor(png.width * 0.25)
  const cy = Math.floor(png.height * 0.55)
  circle(png, cx, cy, Math.floor(png.height * 0.32), [34, 197, 94, 255])
  circle(png, cx, cy, Math.floor(png.height * 0.18), [255, 255, 255, 255])
  const x = Math.floor(png.width * 0.48)
  const y = Math.floor(png.height * 0.22)
  const w = Math.floor(png.width * 0.44)
  const h = Math.floor(png.height * 0.56)
  roundedRect(png, x, y, w, h, Math.floor(png.height * 0.06), [17, 24, 39, 255])
  roundedRect(png, x + 26, y + 26, Math.floor(w * 0.72), 18, 9, [255, 255, 255, 220])
  roundedRect(png, x + 26, y + 62, Math.floor(w * 0.52), 18, 9, [255, 255, 255, 160])
  roundedRect(png, x + 26, y + 98, Math.floor(w * 0.6), 18, 9, [255, 255, 255, 160])
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

/** Recorte centro cuadrado + escala a outW x outH (iconos PWA) */
function resizeCropCenterSquare(src: PNG, outW: number, outH: number): PNG {
  const side = Math.min(src.width, src.height)
  const sx0 = (src.width - side) / 2
  const sy0 = (src.height - side) / 2
  const out = new PNG({ width: outW, height: outH })
  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      const fx = sx0 + (x / (outW - 1 || 1)) * (side - 1)
      const fy = sy0 + (y / (outH - 1 || 1)) * (side - 1)
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

function blitOverOpaqueBackground(dst: PNG, dstX: number, dstY: number, src: PNG) {
  for (let y = 0; y < src.height; y++) {
    const dy = dstY + y
    if (dy < 0 || dy >= dst.height) continue
    for (let x = 0; x < src.width; x++) {
      const dx = dstX + x
      if (dx < 0 || dx >= dst.width) continue
      const si = (src.width * y + x) << 2
      const sa = src.data[si + 3]
      if (sa === 0) continue
      const di = (dst.width * dy + dx) << 2
      const dr = dst.data[di]
      const dg = dst.data[di + 1]
      const db = dst.data[di + 2]
      const sr = src.data[si]
      const sg = src.data[si + 1]
      const sb = src.data[si + 2]
      const a = sa / 255
      dst.data[di] = Math.round(sr * a + dr * (1 - a))
      dst.data[di + 1] = Math.round(sg * a + dg * (1 - a))
      dst.data[di + 2] = Math.round(sb * a + db * (1 - a))
      dst.data[di + 3] = 255
    }
  }
}

/** 512 maskable: logo ~72% ancho, centrado, fondo theme */
function makeMaskable512(src: PNG): PNG {
  const S = 512
  const out = new PNG({ width: S, height: S })
  fill(out, MASK_BG)
  const inner = Math.floor(S * 0.72)
  const resized = resizeCropCenterSquare(src, inner, inner)
  const ox = Math.floor((S - inner) / 2)
  const oy = Math.floor((S - inner) / 2)
  blitOverOpaqueBackground(out, ox, oy, resized)
  return out
}

function ensureSourceLogoPng(): PNG {
  if (!fs.existsSync(LOGO_PATH)) {
    const png = new PNG({ width: 512, height: 512 })
    drawPlaceholderLogo(png)
    writePng(LOGO_REL, png)
    return png
  }
  try {
    return PNG.sync.read(fs.readFileSync(LOGO_PATH))
  } catch {
    const png = new PNG({ width: 512, height: 512 })
    drawPlaceholderLogo(png)
    writePng(LOGO_REL, png)
    return png
  }
}

ensureDir(PUBLIC_DIR)

const logo = ensureSourceLogoPng()

// Siempre regenerar iconos desde CelimapLOGO.png (mismo asset que sitio / JSON-LD / mails)
writePng("icon-192.png", resizeCropCenterSquare(logo, 192, 192))
writePng("icon-512.png", resizeCropCenterSquare(logo, 512, 512))
writePng("maskable-512.png", makeMaskable512(logo))

writePngIfMissing("og.png", 1200, 630, drawOg)

console.log(
  "[pwa] icons from",
  LOGO_REL,
  "→",
  ["icon-192.png", "icon-512.png", "maskable-512.png"].join(", "),
)
