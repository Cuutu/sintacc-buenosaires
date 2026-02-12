import { NextRequest, NextResponse } from "next/server"
import { v2 as cloudinary } from "cloudinary"
import { requireAuth, requireAdmin } from "@/lib/middleware"

const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const folder = (formData.get("folder") as string) || "celimap"
    const file = formData.get("file")

    const session =
      folder === "places"
        ? await requireAdmin(request)
        : await requireAuth(request)
    if (session instanceof NextResponse) return session

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    if (!cloudName || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return NextResponse.json(
        { error: "Cloudinary no configurado. Revisá las variables de entorno." },
        { status: 500 }
      )
    }

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "No se envió ningún archivo" },
        { status: 400 }
      )
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipo de archivo no permitido. Usá JPEG, PNG o WebP" },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "La imagen no puede superar 5MB" },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const base64 = buffer.toString("base64")
    const dataUri = `data:${file.type};base64,${base64}`

    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      cloudinary.uploader.upload(
        dataUri,
        { folder, resource_type: "image" },
        (err, res) => {
          if (err) reject(err)
          else if (res?.secure_url) resolve({ secure_url: res.secure_url })
          else reject(new Error("Upload falló"))
        }
      )
    })

    return NextResponse.json({ url: result.secure_url })
  } catch (error: unknown) {
    console.error("Upload error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al subir la imagen" },
      { status: 500 }
    )
  }
}
