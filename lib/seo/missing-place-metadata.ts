import type { Metadata } from "next"

/** Ficha unpublished / slug inexistente. Layout suma "| CeliMap". */
export const missingPlaceMetadata: Metadata = {
  title: "No encontramos este lugar",
  description:
    "Este lugar no está en CeliMap o fue dado de baja. Podés volver al mapa o al inicio.",
  robots: { index: false, follow: true },
}
