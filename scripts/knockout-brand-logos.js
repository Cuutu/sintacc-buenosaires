/**
 * Knock out edge-connected background from brand PNGs.
 * Interior cream (wheat in pin) stays — not connected to canvas edge.
 */
const fs = require("fs")
const path = require("path")
const { PNG } = require("pngjs")
const sharp = require("sharp")

const SRC = path.join(__dirname, "..", "newbranding")
const DST = path.join(__dirname, "..", "public", "brand")
const PUB = path.join(__dirname, "..", "public")

function dist(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2
  const dg = g1 - g2
  const db = b1 - b2
  return Math.sqrt(dr * dr + dg * dg + db * db)
}

function sampleCorner(png) {
  const { width, data } = png
  const i = 2 * 4
  return [data[i], data[i + 1], data[i + 2]]
}

function knockOutBackground(png, maxDist = 24, fadeDist = 46) {
  const { width, height, data } = png
  const bg = sampleCorner(png)
  const visited = new Uint8Array(width * height)
  const queue = []

  const tryPush = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return
    const idx = y * width + x
    if (visited[idx]) return
    const i = idx << 2
    if (data[i + 3] === 0) return
    if (dist(data[i], data[i + 1], data[i + 2], bg[0], bg[1], bg[2]) > fadeDist) return
    visited[idx] = 1
    queue.push(idx)
  }

  for (let x = 0; x < width; x++) {
    tryPush(x, 0)
    tryPush(x, height - 1)
  }
  for (let y = 0; y < height; y++) {
    tryPush(0, y)
    tryPush(width - 1, y)
  }

  let head = 0
  while (head < queue.length) {
    const idx = queue[head++]
    const x = idx % width
    const y = (idx / width) | 0
    const i = idx << 2
    const d = dist(data[i], data[i + 1], data[i + 2], bg[0], bg[1], bg[2])
    if (d <= maxDist) {
      data[i + 3] = 0
    } else {
      const t = (d - maxDist) / (fadeDist - maxDist)
      data[i + 3] = Math.round(Math.min(data[i + 3], t * 255))
    }
    tryPush(x + 1, y)
    tryPush(x - 1, y)
    tryPush(x, y + 1)
    tryPush(x, y - 1)
  }
}

function trimAlpha(png, pad = 8) {
  const { width, height, data } = png
  let minX = width
  let minY = height
  let maxX = 0
  let maxY = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[((width * y + x) << 2) + 3] > 8) {
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < minX) return png
  minX = Math.max(0, minX - pad)
  minY = Math.max(0, minY - pad)
  maxX = Math.min(width - 1, maxX + pad)
  maxY = Math.min(height - 1, maxY + pad)
  const w = maxX - minX + 1
  const h = maxY - minY + 1
  const out = new PNG({ width: w, height: h })
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const si = ((width * (minY + y) + (minX + x)) << 2)
      const di = ((w * y + x) << 2)
      out.data[di] = data[si]
      out.data[di + 1] = data[si + 1]
      out.data[di + 2] = data[si + 2]
      out.data[di + 3] = data[si + 3]
    }
  }
  return out
}

function load(name) {
  return PNG.sync.read(fs.readFileSync(path.join(SRC, name)))
}

async function writePng(rel, png, extraResize) {
  const buf = PNG.sync.write(png)
  let pipeline = sharp(buf)
  if (extraResize) {
    const square = extraResize.width && extraResize.height && extraResize.width === extraResize.height
    pipeline = pipeline.resize({
      ...extraResize,
      fit: square ? "contain" : "inside",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
  }
  const outPath = path.isAbsolute(rel) ? rel : path.join(DST, rel)
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  await pipeline.png({ compressionLevel: 9 }).toFile(outPath)
  const meta = await sharp(outPath).metadata()
  const stat = fs.statSync(outPath)
  console.log(path.relative(PUB, outPath), meta.width + "x" + meta.height, Math.round(stat.size / 1024) + "kb")
}

async function run() {
  const principal = trimAlpha(knockOutAndReturn(load("logo-principal.png")))
  const principalNeg = trimAlpha(knockOutAndReturn(load("logo-principal-neg.png")))
  const faicon = trimAlpha(knockOutAndReturn(load("faicon.png")))
  const appIcon = trimAlpha(knockOutAndReturn(load("app-icon.png")))
  const ig = trimAlpha(knockOutAndReturn(load("icon-ig.png")))
  await writePng("logo-principal.png", principal, { width: 1200 })
  await writePng("logo-principal-neg.png", principalNeg, { width: 1200 })
  await writePng("favicon-mark.png", faicon, { width: 512, height: 512 })
  await writePng("app-icon.png", appIcon, { width: 512 })
  await writePng("icon-ig.png", ig, { width: 512 })
  await writePng("mark.png", faicon, { width: 512 })

  await writePng(path.join(PUB, "CelimapLOGO.png"), faicon, { width: 512 })
  await writePng(path.join(PUB, "celimaplogocompleto.png"), principal, { width: 1200 })
  await writePng(path.join(PUB, "favicon-32.png"), faicon, { width: 32, height: 32 })

  const olive = Buffer.from([45, 74, 52, 255])
  await sharp(PNG.sync.write(appIcon))
    .resize(1024, 1024, { fit: "contain", background: { r: 45, g: 74, b: 52, alpha: 1 } })
    .flatten({ background: { r: 45, g: 74, b: 52 } })
    .png({ compressionLevel: 9 })
    .toFile(path.join(PUB, "celimappwa.png"))
  void olive
  console.log("celimappwa.png flattened on olive")
}

function knockOutAndReturn(png) {
  knockOutBackground(png)
  return png
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
