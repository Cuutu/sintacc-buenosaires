import { v2 as cloudinary } from "cloudinary"
import { parseCloudinaryPublicIdFromUrl } from "@/lib/cloudinary/public-id-from-url"

export type DestroyAssetsResult = {
  destroyed: string[]
  failed: string[]
  skipped: string[]
}

function configureCloudinary(): string | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim() || ""
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim() || ""
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim() || ""
  if (!cloudName || !apiKey || !apiSecret) return null
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret })
  return cloudName
}

async function destroyOne(publicId: string): Promise<boolean> {
  return new Promise((resolve) => {
    cloudinary.uploader.destroy(
      publicId,
      { resource_type: "image", invalidate: true },
      (err, res) => {
        if (err) {
          resolve(false)
          return
        }
        const result = (res as { result?: string } | undefined)?.result
        resolve(result === "ok" || result === "not found")
      }
    )
  })
}

const PUBLIC_ID_RE = /^[a-zA-Z0-9_\-/]+$/

function isSafePublicId(publicId: string): boolean {
  return (
    typeof publicId === "string" &&
    publicId.length > 0 &&
    publicId.length < 512 &&
    !publicId.includes("..") &&
    PUBLIC_ID_RE.test(publicId)
  )
}

/** Destroy by already-validated public_ids (preferred for AccountDeletionJob). */
export async function destroyCloudinaryPublicIds(
  publicIds: string[],
  options?: { dryRun?: boolean }
): Promise<DestroyAssetsResult> {
  const unique = [
    ...new Set(publicIds.filter((id) => typeof id === "string" && id.length > 0)),
  ]
  const result: DestroyAssetsResult = { destroyed: [], failed: [], skipped: [] }
  if (unique.length === 0) return result

  const cloudName = configureCloudinary()
  if (!cloudName) {
    result.failed.push(...unique)
    return result
  }

  for (const publicId of unique) {
    if (!isSafePublicId(publicId)) {
      result.skipped.push(publicId)
      continue
    }
    if (options?.dryRun) {
      result.destroyed.push(publicId)
      continue
    }
    const ok = await destroyOne(publicId)
    if (ok) result.destroyed.push(publicId)
    else result.failed.push(publicId)
  }
  return result
}

/**
 * Parse URLs → public_ids then destroy. Skips unparseable URLs (no guessing).
 */
export async function destroyCloudinaryUrls(
  urls: string[],
  options?: { dryRun?: boolean }
): Promise<DestroyAssetsResult & { pendingPublicIds: string[]; unparseableUrls: number }> {
  const unique = [...new Set(urls.filter((u) => typeof u === "string" && u.length > 0))]
  const empty: DestroyAssetsResult & {
    pendingPublicIds: string[]
    unparseableUrls: number
  } = {
    destroyed: [],
    failed: [],
    skipped: [],
    pendingPublicIds: [],
    unparseableUrls: 0,
  }
  if (unique.length === 0) return empty

  const cloudName = configureCloudinary()
  if (!cloudName) {
    return {
      ...empty,
      failed: unique,
      unparseableUrls: 0,
    }
  }

  const publicIds: string[] = []
  let unparseableUrls = 0
  for (const url of unique) {
    const parsed = parseCloudinaryPublicIdFromUrl(url, cloudName)
    if (!parsed.ok) {
      unparseableUrls += 1
      empty.skipped.push(url)
      continue
    }
    publicIds.push(parsed.publicId)
  }

  const destroy = await destroyCloudinaryPublicIds(publicIds, options)
  return {
    ...destroy,
    skipped: [...empty.skipped, ...destroy.skipped],
    pendingPublicIds: destroy.failed,
    unparseableUrls,
  }
}
