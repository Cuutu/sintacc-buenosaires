import type { Metadata } from "next";
import { getBaseUrl } from "@/lib/base-url";
import { MapaSeoIntro } from "@/components/mapa/MapaSeoIntro";

const BASE_URL = getBaseUrl();

export const metadata: Metadata = {
  title: "Mapa para celíacos - Lugares sin tacc",
  description:
    "Mapa interactivo para celíacos en Argentina. Restaurantes, cafés y panaderías sin tacc en Buenos Aires, La Plata, Tucumán y más. Filtros por zona y nivel de seguridad.",
  keywords: [
    "mapa sin tacc",
    "mapa celiaco",
    "mapa interactivo celíacos",
    "restaurantes sin gluten cerca",
    "lugares aptos celíacos",
  ],
  alternates: { canonical: `${BASE_URL}/mapa` },
  openGraph: {
    title: "Mapa para celíacos - Lugares sin tacc",
    description:
      "Mapa interactivo con restaurantes, cafés y panaderías sin tacc en Argentina.",
    url: `${BASE_URL}/mapa`,
    type: "website",
  },
};

export default function MapaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-[100dvh] md:h-[calc(100vh-4rem)] -mb-[calc(5rem+env(safe-area-inset-bottom))] md:mb-0 min-h-0 flex-col overflow-hidden">
      <MapaSeoIntro />
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  )
}
