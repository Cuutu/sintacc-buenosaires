import type { Metadata } from "next"

/** Ficha unpublished / slug inexistente. Layout suma "| CeliMap". */
export const missingPlaceMetadata: Metadata = {
  title: "No encontramos este lugar",
  description:
    "Este lugar no está en CeliMap o fue dado de baja. Podés volver al mapa o al inicio.",
  robots: { index: false, follow: true },
}

/** Cualquier otra dirección que no existe (404 general). */
export const missingPageMetadata: Metadata = {
  title: "Página no encontrada",
  description: "La dirección no existe o cambió. Podés volver al mapa o al inicio.",
  robots: { index: false, follow: true },
}
