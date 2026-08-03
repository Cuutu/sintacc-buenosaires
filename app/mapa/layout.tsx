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
  // Desktop: mapa full viewport; SEO debajo (scroll de página).
  // Mobile: mapa full dvh (sin SEO visible; BottomNav aparte).
  return (
    <div className="flex min-h-0 flex-col md:h-auto md:min-h-0 md:overflow-visible">
      <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden -mb-[var(--bottom-nav-clearance)] md:mb-0 md:h-[calc(100vh-4rem)] md:min-h-[calc(100vh-4rem)] md:shrink-0">
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </div>
      <MapaSeoIntro />
    </div>
  )
}
