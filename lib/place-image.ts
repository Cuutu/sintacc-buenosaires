/** Thumb chico para lista. Popup usa tamaño medio, no el original. */
export type PlaceImageRole = "thumb" | "popup"

const TRANSFORMS: Record<PlaceImageRole, string> = {
  thumb: "c_fill,g_auto,w_168,h_168,f_auto,q_auto",
  popup: "c_fill,g_auto,w_640,h_360,f_auto,q_auto",
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
