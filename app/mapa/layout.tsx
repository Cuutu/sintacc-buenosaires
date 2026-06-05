import type { Metadata } from "next";
import { getBaseUrl } from "@/lib/base-url";

const BASE_URL = getBaseUrl();

export const metadata: Metadata = {
  title: "Mapa para celíacos - Lugares sin TACC",
  description:
    "Mapa interactivo para celíacos: restaurantes, cafés y panaderías sin gluten en Buenos Aires, Córdoba y todo el mundo. Filtros por zona, tipo y nivel de seguridad. Lugares verificados por la comunidad.",
  keywords: [
    "mapa interactivo celíacos",
    "restaurantes sin gluten cerca",
    "mapa sin TACC",
    "lugares aptos celíacos",
  ],
  alternates: { canonical: `${BASE_URL}/mapa` },
  openGraph: {
    title: "Mapa para celÃ­acos - Lugares sin TACC",
    description:
      "Mapa interactivo para celÃ­acos: restaurantes, cafÃ©s y panaderÃ­as sin gluten en Buenos Aires, CÃ³rdoba y todo el mundo.",
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
    <div className="h-[100dvh] md:h-[calc(100vh-4rem)] -mb-[calc(5rem+env(safe-area-inset-bottom))] md:mb-0 min-h-0 overflow-hidden">
      {children}
    </div>
  )
}
