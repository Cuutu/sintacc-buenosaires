import type { Metadata } from "next"
import { getBaseUrl } from "@/lib/base-url"

const BASE_URL = getBaseUrl()

export const metadata: Metadata = {
  title: "Listas de lugares sin gluten | Celimap",
  description:
    "Descubri listas de restaurantes, cafes, panaderias y lugares sin gluten creadas por la comunidad de Celimap.",
  alternates: { canonical: `${BASE_URL}/listas` },
  openGraph: {
    title: "Listas de lugares sin gluten | Celimap",
    description:
      "Descubri listas de restaurantes, cafes, panaderias y lugares sin gluten creadas por la comunidad.",
    url: `${BASE_URL}/listas`,
    type: "website",
  },
}

export default function ListasLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
