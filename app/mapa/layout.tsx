import type { Metadata } from "next";

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
