/**
 * Derive Cloudinary public_id from a secure_url we ourselves produced.
 * Never trust client-supplied IDs — only parse URLs that match our cloud + folders.
 */

const ALLOWED_FOLDERS = new Set(["celimap", "places", "ventures", "lists", "social"])

export type CloudinaryPublicIdParse =
  | { ok: true; publicId: string; cloudName: string; folder: string }
  | { ok: false; reason: string }

/**
 * Expected shape:
 * https://res.cloudinary.com/{cloud}/image/upload/[transforms/]v123/{folder}/{id}.{ext}
 * https://res.cloudinary.com/{cloud}/image/upload/{folder}/{id}.{ext}
 */
export function parseCloudinaryPublicIdFromUrl(
  url: string,
  expectedCloudName: string
): CloudinaryPublicIdParse {
  if (!url || typeof url !== "string" || url.length > 2048) {
    return { ok: false, reason: "invalid_url" }
  }
  if (!expectedCloudName || expectedCloudName.length > 128) {
    return { ok: false, reason: "missing_cloud" }
  }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { ok: false, reason: "invalid_url" }
  }

  if (parsed.protocol !== "https:") {
    return { ok: false, reason: "insecure_protocol" }
  }
  if (parsed.hostname !== "res.cloudinary.com") {
    return { ok: false, reason: "wrong_host" }
  }

  // /{cloud}/image/upload/...
  const parts = parsed.pathname.split("/").filter(Boolean)
  if (parts.length < 4) {
    return { ok: false, reason: "short_path" }
  }
  const [cloudName, resourceType, uploadMarker, ...rest] = parts
  if (cloudName !== expectedCloudName) {
    return { ok: false, reason: "wrong_cloud" }
  }
  if (resourceType !== "image" || uploadMarker !== "upload") {
    return { ok: false, reason: "not_image_upload" }
  }
  if (rest.length === 0) {
    return { ok: false, reason: "empty_public_id" }
  }

  // Strip optional transformation segments and optional version `v123456`.
  let i = 0
  while (i < rest.length) {
    const seg = rest[i]
    if (/^v\d+$/.test(seg)) {
      i += 1
      break
    }
    // Transformation segments contain commas or underscores with params (e.g. c_fill,w_100)
    if (seg.includes(",") || /^(c_|w_|h_|q_|f_|fl_)/.test(seg)) {
      i += 1
      continue
    }
    break
  }

  const idParts = rest.slice(i)
  if (idParts.length === 0) {
    return { ok: false, reason: "empty_public_id" }
  }

  // Remove file extension from last segment only.
  const last = idParts[idParts.length - 1]
  const withoutExt = last.replace(/\.[a-zA-Z0-9]{2,5}$/, "")
  idParts[idParts.length - 1] = withoutExt
  const publicId = idParts.join("/")
  const folder = idParts[0] || ""

  if (!ALLOWED_FOLDERS.has(folder)) {
    return { ok: false, reason: "folder_not_allowed" }
  }
  if (!/^[a-zA-Z0-9_\-/]+$/.test(publicId) || publicId.includes("..")) {
    return { ok: false, reason: "public_id_chars" }
  }

  return { ok: true, publicId, cloudName, folder }
}
