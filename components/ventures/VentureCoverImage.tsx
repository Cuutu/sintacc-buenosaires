import Image from "next/image"
import { cn } from "@/lib/utils"

/** Fondo del recuadro cuando la portada es un logo (va en el contenedor). */
export const VENTURE_LOGO_BACKDROP = "bg-[#F7F3EB]"

/**
 * Portada de un emprendimiento. Una foto llena el recuadro; un logo (marcado en el
 * admin) va entero, con aire alrededor, y el blanco de su fondo se funde con el crema
 * (`mix-blend-multiply`) para que no quede un cuadrado blanco sobre la tarjeta.
 */
export function VentureCoverImage({
  src,
  isLogo,
  sizes,
  alt = "",
  priority,
  className,
}: {
  src: string
  isLogo?: boolean
  sizes: string
  alt?: string
  priority?: boolean
  className?: string
}) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      priority={priority}
      sizes={sizes}
      className={cn(isLogo ? "object-contain p-[14%] mix-blend-multiply" : "object-cover", className)}
    />
  )
}
