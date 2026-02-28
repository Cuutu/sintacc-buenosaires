import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mapa para celíacos - Lugares sin TACC",
  description:
    "Mapa interactivo para celíacos: restaurantes, cafés y panaderías sin gluten en todo el mundo. Filtros por zona, tipo y nivel de seguridad. Lugares verificados por la comunidad.",
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
