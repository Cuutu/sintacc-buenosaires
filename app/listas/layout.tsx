import type { Metadata } from "next"
import { getBaseUrl } from "@/lib/base-url"
import { OG_IMAGE } from "@/lib/seo/og"

const BASE_URL = getBaseUrl()

export const metadata: Metadata = {
  // Objeto y no texto: con un texto, Next corta la plantilla "%s | CeliMap" para las
  // páginas de adentro (el detalle de una lista salía sin la marca). Sin el espacio
  // del final, que dejaba "sin gluten  | CeliMap" (revisión 23/10).
  title: { default: "Listas de lugares sin gluten", template: "%s | CeliMap" },
  description:
    "Descubrí listas de restaurantes, cafés, panaderías y lugares sin gluten creadas por la comunidad de CeliMap.",
  alternates: { canonical: `${BASE_URL}/listas` },
  openGraph: {
    title: "Listas de lugares sin gluten | CeliMap",
    description:
      "Descubri listas de restaurantes, cafes, panaderias y lugares sin gluten creadas por la comunidad.",
    url: `${BASE_URL}/listas`,
    type: "website",
    images: [OG_IMAGE],
  },
}

export default function ListasLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
