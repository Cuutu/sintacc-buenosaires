import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mapa de lugares sin TACC",
  description:
    "Mapa interactivo de restaurantes, cafés y panaderías sin gluten en Buenos Aires. Filtros por barrio, tipo y nivel de seguridad.",
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
