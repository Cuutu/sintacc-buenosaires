import { v2 as cloudinary } from "cloudinary"

export const SOCIAL_UPLOAD_FOLDER = "social"

function ensureCloudinaryConfig(): void {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary no configurado. Revisá las variables de entorno.")
  }
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret })
}

export async function uploadImageBuffer(
  buffer: Buffer,
  folder: string = SOCIAL_UPLOAD_FOLDER,
  mime: "image/png" | "image/jpeg" | "image/webp" = "image/png"
): Promise<string> {
  ensureCloudinaryConfig()
  const dataUri = `data:${mime};base64,${buffer.toString("base64")}`

  const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
    cloudinary.uploader.upload(
      dataUri,
      { folder, resource_type: "image" },
      (err, res) => {
        if (err) reject(err)
        else if (res?.secure_url) resolve({ secure_url: res.secure_url })
        else reject(new Error("Upload a Cloudinary falló"))
      }
    )
  })

  return result.secure_url
}
