/**
 * Imágenes de la tarjeta de Google Wallet. Google las baja desde sus servidores,
 * así que van a Cloudinary (público también desde prueba) con un id fijo:
 * cada combinación de sellos se dibuja y se sube una sola vez.
 */

import { readFile } from "fs/promises"
import path from "path"
import { absoluteUrl } from "@/lib/base-url"
import { logger } from "@/lib/logger"
import { uploadImageBuffer } from "@/lib/cloudinary/upload-buffer"
import { GOOGLE_HERO_BOX, renderStampStrip } from "@/lib/wallet/stamp-strip"

const FOLDER = "wallet"
// Subir la versión si cambia el diseño, así Google no muestra la imagen vieja.
const DESIGN_VERSION = "v1"

const urls = new Map<string, string>()

function cloudinaryUrl(publicId: string): string | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim()
  return cloudName ? `https://res.cloudinary.com/${cloudName}/image/upload/${FOLDER}/${publicId}.png` : null
}

async function exists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD", cache: "no-store" })
    return res.ok
  } catch {
    return false
  }
}

/** URL pública de la imagen; la dibuja y la sube sólo si todavía no está. */
async function publicImage(publicId: string, draw: () => Promise<Buffer>): Promise<string | null> {
  const cached = urls.get(publicId)
  if (cached) return cached
  const url = cloudinaryUrl(publicId)
  if (!url) return null
  try {
    const finalUrl = (await exists(url))
      ? url
      : await uploadImageBuffer(await draw(), FOLDER, "image/png", { publicId, overwrite: false })
    urls.set(publicId, finalUrl)
    return finalUrl
  } catch (error) {
    logger.warn({
      route: "wallet-images",
      message: "no se pudo subir la imagen de la tarjeta",
      publicId,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

/** Logo cuadrado (Google lo recorta en círculo). */
export async function googleLogoUrl(): Promise<string> {
  const url = await publicImage(`logo-${DESIGN_VERSION}`, () =>
    readFile(path.join(process.cwd(), "public", "wallet", "logo.png"))
  )
  return url ?? absoluteUrl("/wallet/logo.png")
}

/** Franja de sellos; null si no se pudo (la tarjeta sale sin imagen). */
export function googleHeroUrl(stamps: number, total: number): Promise<string | null> {
  return publicImage(`sellos-${DESIGN_VERSION}-${stamps}-${total}`, () =>
    renderStampStrip(stamps, total, GOOGLE_HERO_BOX)
  )
}
