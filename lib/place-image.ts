/**
 * Thumb chico para lista. Popup usa tamaño medio, no el original.
 * og / large: lo que bajan WhatsApp, Facebook, Google y compañía (OG y JSON-LD).
 * Van en JPG fijo (no f_auto) porque no todos los crawlers aceptan WebP/AVIF, y
 * nunca el original: una foto de celular pesa varios MB y cada vista previa la bajaba entera.
 */
export type PlaceImageRole = "thumb" | "popup" | "og" | "large"

const TRANSFORMS: Record<PlaceImageRole, string> = {
  thumb: "c_fill,g_auto,w_168,h_168,f_auto,q_auto",
  popup: "c_fill,g_auto,w_640,h_360,f_auto,q_auto",
  og: "c_fill,g_auto,w_1200,h_630,f_jpg,q_auto",
  large: "c_limit,w_1200,h_1200,f_jpg,q_auto",
}

function injectCloudinaryTransform(url: string, transform: string): string {
  const upload = "/image/upload/"
  const idx = url.indexOf(upload)
  if (idx === -1) return url
  const after = url.slice(idx + upload.length)
  if (!after) return url
  const first = after.split("/")[0] ?? ""
  if (/^[a-z]_/.test(first) || first.startsWith("w_") || first.startsWith("c_")) {
    return url
  }
  return `${url.slice(0, idx + upload.length)}${transform}/${after}`
}

export function getPlaceImageUrl(
  src: string | null | undefined,
  role: PlaceImageRole
): string | null {
  if (!src || typeof src !== "string") return null
  const trimmed = src.trim()
  if (!trimmed) return null
  if (trimmed.includes("res.cloudinary.com")) {
    return injectCloudinaryTransform(trimmed, TRANSFORMS[role])
  }
  return trimmed
}

/** Fotos de nuestra cuenta (o cualquier otra) servidas por Cloudinary. */
export function isCloudinaryImageUrl(src: string): boolean {
  return /^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//.test(src)
}

const TRANSFORM_TOKEN = /^(?:c|g|w|h|f|q|ar|e|b|x|y|z|r|a|o|fl|dpr|t)_[^,/]+$/

function isTransformSegment(segment: string): boolean {
  return segment.length > 0 && segment.split(",").every((token) => TRANSFORM_TOKEN.test(token))
}

/**
 * Loader de next/image para fotos de Cloudinary: el tamaño y el formato (AVIF o
 * WebP según el navegador) los resuelve Cloudinary desde su CDN, en vez de que
 * el servidor baje la foto y la recomprima. Si la URL ya trae un recorte (los
 * roles de getPlaceImageUrl), se encadena un paso que solo achica.
 */
export function cloudinaryImageLoader({
  src,
  width,
  quality,
}: {
  src: string
  width: number
  quality?: number
}): string {
  const marker = "/image/upload/"
  const idx = src.indexOf(marker)
  if (idx === -1) return src
  const head = src.slice(0, idx + marker.length)
  const rest = src.slice(idx + marker.length)
  const step = `c_limit,w_${width},f_auto,q_${quality ?? "auto"}`
  const first = rest.split("/")[0] ?? ""
  if (isTransformSegment(first)) {
    return `${head}${first}/${step}/${rest.slice(first.length + 1)}`
  }
  return `${head}${step}/${rest}`
}
