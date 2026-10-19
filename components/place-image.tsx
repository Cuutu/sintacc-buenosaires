"use client"

import Image, { type ImageProps } from "next/image"
import { cloudinaryImageLoader, isCloudinaryImageUrl } from "@/lib/place-image"

/**
 * next/image para fotos de lugares y reseñas. Si la foto es de Cloudinary, la
 * achica y la convierte Cloudinary (CDN) en vez del servidor; las demás (Google,
 * locales) siguen por el optimizador de Next.
 *
 * NEXT_PUBLIC_CLOUDINARY_DIRECT=0 (y rebuild) vuelve todo al optimizador de Next,
 * por si el consumo de Cloudinary se acerca al límite del plan.
 */
export function PlaceImage({ alt, ...props }: ImageProps) {
  const src = typeof props.src === "string" ? props.src : null
  const direct = process.env.NEXT_PUBLIC_CLOUDINARY_DIRECT !== "0"
  if (direct && src && isCloudinaryImageUrl(src)) {
    return <Image alt={alt} {...props} loader={cloudinaryImageLoader} />
  }
  return <Image alt={alt} {...props} />
}
