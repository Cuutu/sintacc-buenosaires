import { uploadImageBuffer } from "@/lib/cloudinary/upload-buffer"
import { getGoogleMapsApiKey } from "@/lib/google-places"

const GOOGLE_PLACES_BASE_URL = "https://places.googleapis.com/v1/places"
const PHOTO_MAX_WIDTH = 1200

export function placeNeedsGoogleCoverPhoto(place: {
  photos?: string[] | null
  googlePlaceId?: string | null
}): boolean {
  if (!place.googlePlaceId?.trim()) return false
  return !place.photos?.[0]?.trim()
}

export function googlePhotoMediaUrl(photoName: string, apiKey: string): string {
  const name = photoName.replace(/^\/+/, "")
  return `https://places.googleapis.com/v1/${name}/media?maxWidthPx=${PHOTO_MAX_WIDTH}&key=${encodeURIComponent(apiKey)}`
}

type GooglePhotoRef = {
  name?: string
  authorAttributions?: Array<{ displayName?: string }>
}

export async function fetchGoogleCoverPhotoName(
  googlePlaceId: string
): Promise<string | null> {
  const apiKey = getGoogleMapsApiKey()
  if (!apiKey) return null

  const res = await fetch(
    `${GOOGLE_PLACES_BASE_URL}/${encodeURIComponent(googlePlaceId)}?languageCode=es-419`,
    {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "photos",
      },
    }
  )
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`Place Details photos ${res.status}: ${body.slice(0, 180)}`)
  }

  const data = (await res.json()) as { photos?: GooglePhotoRef[] }
  const name = data.photos?.[0]?.name?.trim()
  return name || null
}

async function downloadGooglePhoto(photoName: string): Promise<Buffer | null> {
  const apiKey = getGoogleMapsApiKey()
  if (!apiKey) return null

  const res = await fetch(googlePhotoMediaUrl(photoName, apiKey))
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`Place Photo media ${res.status}: ${body.slice(0, 180)}`)
  }
  const contentType = res.headers.get("content-type") ?? ""
  if (!contentType.startsWith("image/")) {
    throw new Error(`Place Photo media no es imagen: ${contentType}`)
  }
  const bytes = Buffer.from(await res.arrayBuffer())
  return bytes.length > 0 ? bytes : null
}

export async function fetchAndStoreGoogleCoverPhoto(
  googlePlaceId: string
): Promise<string | null> {
  const photoName = await fetchGoogleCoverPhotoName(googlePlaceId)
  if (!photoName) return null
  const bytes = await downloadGooglePhoto(photoName)
  if (!bytes) return null
  return uploadImageBuffer(bytes, "places", "image/jpeg")
}
