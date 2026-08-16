/** Paleta de pins CeliMap — no agregar más colores. */
export const CELIMAP_PIN = {
  dedicated: "#1F4D35",
  options: "#C85A2E",
  unknown: "#CFC9BF",
  cream: "#F6F1E8",
  iconOnDark: "#FFFFFF",
  iconOnUnknown: "#1F4D35",
} as const

export type CeliMapPinSafety = "dedicated_gf" | "gf_options" | "unknown"

export function pinFillForSafety(safety: CeliMapPinSafety | string): string {
  if (safety === "dedicated_gf") return CELIMAP_PIN.dedicated
  if (safety === "gf_options") return CELIMAP_PIN.options
  return CELIMAP_PIN.unknown
}

export function pinIconForSafety(safety: CeliMapPinSafety | string): string {
  return safety === "unknown" ? CELIMAP_PIN.iconOnUnknown : CELIMAP_PIN.iconOnDark
}

export function pinImageId(safety: CeliMapPinSafety | string): string {
  if (safety === "dedicated_gf") return "celimap-pin-dedicated"
  if (safety === "gf_options") return "celimap-pin-options"
  return "celimap-pin-unknown"
}

/** PNG oficiales. unknown sigue rasterizado. */
export function pinAssetPath(safety: CeliMapPinSafety | string): string | null {
  if (safety === "dedicated_gf") return "/map/pin-dedicated.png"
  if (safety === "gf_options") return "/map/pin-options.png"
  return null
}

/**
 * Isotipo CeliMap: gota / map-pin (punta abajo) + espiga tachada.
 * viewBox 64×84 — ancla inferior en el mapa.
 */
export function celimapPinSvg(opts: {
  fill: string
  icon: string
  label?: string
}): string {
  const fill = opts.fill
  const icon = opts.icon
  const wheatOrLabel = opts.label
    ? `<text x="32" y="34" text-anchor="middle" fill="${icon}" font-family="ui-sans-serif,system-ui,sans-serif" font-size="18" font-weight="700">${opts.label}</text>`
    : `<g fill="${icon}">
        <ellipse cx="32" cy="20.5" rx="3.1" ry="4.5"/>
        <ellipse cx="26.4" cy="24.2" rx="2.7" ry="4" transform="rotate(-34 26.4 24.2)"/>
        <ellipse cx="37.6" cy="24.2" rx="2.7" ry="4" transform="rotate(34 37.6 24.2)"/>
        <ellipse cx="26.2" cy="30.4" rx="2.7" ry="4" transform="rotate(-26 26.2 30.4)"/>
        <ellipse cx="37.8" cy="30.4" rx="2.7" ry="4" transform="rotate(26 37.8 30.4)"/>
        <rect x="30.55" y="22" width="2.9" height="16.5" rx="1.3"/>
      </g>
      <path d="M23.5 18.5 L41 38" fill="none" stroke="${icon}" stroke-width="2.6" stroke-linecap="round"/>`

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 84" width="64" height="84">
  <ellipse cx="32" cy="80" rx="11" ry="3.1" fill="#1F4D35" opacity="0.16"/>
  <path fill="${fill}" stroke="#F6F1E8" stroke-width="1.5" stroke-linejoin="round"
    d="M32 5.5c-12 0-21.8 9.9-21.8 22.2 0 16.4 17.4 36.6 20.8 40.4a1.8 1.8 0 0 0 2 0c3.4-3.8 20.8-24 20.8-40.4C53.8 15.4 44 5.5 32 5.5z"/>
  ${wheatOrLabel}
</svg>`
}

export function celimapPinMarkup(
  safety: CeliMapPinSafety | string,
  label?: string
): string {
  const src = pinAssetPath(safety)
  if (src) {
    const number = label
      ? `<span style="position:absolute;left:50%;top:36%;transform:translate(-50%,-50%);color:#F6F1E8;font:700 13px Nunito,ui-sans-serif,sans-serif;text-shadow:0 1px 2px rgba(31,77,53,.45)">${label}</span>`
      : ""
    return `<div style="position:relative;width:100%;height:100%"><img alt="" src="${src}" draggable="false" style="width:100%;height:100%;object-fit:contain;object-position:bottom;display:block;pointer-events:none">${number}</div>`
  }
  return celimapPinSvg({
    fill: pinFillForSafety(safety),
    icon: pinIconForSafety(safety),
    label,
  })
}

export const PIN_RASTER_WIDTH = 128
export const PIN_RASTER_HEIGHT = 168

function fillPinBody(ctx: CanvasRenderingContext2D): void {
  try {
    const body = new Path2D(
      "M32 5.5c-12 0-21.8 9.9-21.8 22.2 0 16.4 17.4 36.6 20.8 40.4a1.8 1.8 0 0 0 2 0c3.4-3.8 20.8-24 20.8-40.4C53.8 15.4 44 5.5 32 5.5z"
    )
    ctx.fill(body)
    ctx.stroke(body)
    return
  } catch {
    /* Path2D no disponible */
  }
  ctx.beginPath()
  ctx.arc(32, 27.7, 21.8, Math.PI * 0.82, Math.PI * 0.18)
  ctx.lineTo(32, 68)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
}

function drawCeliMapPin(
  ctx: CanvasRenderingContext2D,
  fill: string,
  icon: string
): void {
  ctx.clearRect(0, 0, PIN_RASTER_WIDTH, PIN_RASTER_HEIGHT)
  ctx.save()
  ctx.scale(2, 2)

  ctx.fillStyle = "rgba(31,77,53,0.18)"
  ctx.beginPath()
  ctx.ellipse(32, 80, 11, 3.1, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = fill
  ctx.lineJoin = "round"
  ctx.strokeStyle = "#F6F1E8"
  ctx.lineWidth = 1.5
  fillPinBody(ctx)

  ctx.fillStyle = icon
  const grain = (cx: number, cy: number, rx: number, ry: number, rot: number) => {
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate((rot * Math.PI) / 180)
    ctx.beginPath()
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  grain(32, 20.5, 3.1, 4.5, 0)
  grain(26.4, 24.2, 2.7, 4, -34)
  grain(37.6, 24.2, 2.7, 4, 34)
  grain(26.2, 30.4, 2.7, 4, -26)
  grain(37.8, 30.4, 2.7, 4, 26)
  ctx.fillRect(30.55, 22, 2.9, 16.5)

  ctx.strokeStyle = icon
  ctx.lineCap = "round"
  ctx.lineWidth = 2.6
  ctx.beginPath()
  ctx.moveTo(23.5, 18.5)
  ctx.lineTo(41, 38)
  ctx.stroke()
  ctx.restore()
}

export type CeliMapPinStyleImage = {
  width: number
  height: number
  data: Uint8Array
}

const styleImageCache = new Map<string, CeliMapPinStyleImage>()

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(src))
    img.src = src
  })
}

function rasterizeHtmlImage(img: HTMLImageElement): CeliMapPinStyleImage {
  const canvas = document.createElement("canvas")
  canvas.width = PIN_RASTER_WIDTH
  canvas.height = PIN_RASTER_HEIGHT
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  if (!ctx) throw new Error("canvas")
  const scale = Math.min(
    PIN_RASTER_WIDTH / img.naturalWidth,
    PIN_RASTER_HEIGHT / img.naturalHeight
  )
  const width = img.naturalWidth * scale
  const height = img.naturalHeight * scale
  const x = (PIN_RASTER_WIDTH - width) / 2
  const y = PIN_RASTER_HEIGHT - height
  ctx.clearRect(0, 0, PIN_RASTER_WIDTH, PIN_RASTER_HEIGHT)
  ctx.drawImage(img, x, y, width, height)
  const imageData = ctx.getImageData(0, 0, PIN_RASTER_WIDTH, PIN_RASTER_HEIGHT)
  return {
    width: imageData.width,
    height: imageData.height,
    data: new Uint8Array(imageData.data),
  }
}

/** Dibuja el pin en canvas. Mapbox no rasteriza SVG de forma fiable. */
export function rasterizeCeliMapPin(safety: CeliMapPinSafety | string): CeliMapPinStyleImage {
  const canvas = document.createElement("canvas")
  canvas.width = PIN_RASTER_WIDTH
  canvas.height = PIN_RASTER_HEIGHT
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  if (!ctx) throw new Error("canvas")
  drawCeliMapPin(ctx, pinFillForSafety(safety), pinIconForSafety(safety))
  const imageData = ctx.getImageData(0, 0, PIN_RASTER_WIDTH, PIN_RASTER_HEIGHT)
  return {
    width: imageData.width,
    height: imageData.height,
    data: new Uint8Array(imageData.data),
  }
}

export async function getCeliMapPinStyleImage(
  safety: CeliMapPinSafety | string
): Promise<CeliMapPinStyleImage> {
  const id = pinImageId(safety)
  const cached = styleImageCache.get(id)
  if (cached) return cached
  const asset = pinAssetPath(safety)
  const image = asset
    ? rasterizeHtmlImage(await loadHtmlImage(asset))
    : rasterizeCeliMapPin(safety)
  styleImageCache.set(id, image)
  return image
}

export const CELIMAP_PIN_SAFETIES: CeliMapPinSafety[] = [
  "dedicated_gf",
  "gf_options",
  "unknown",
]
