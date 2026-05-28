import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Emprendimientos sin gluten",
  description:
    "Marcas, cocineros y proyectos aptos para celíacos: viandas, panificados, pastelería, premezclas y más. Recomendados por la comunidad.",
  keywords: [
    "emprendimientos sin gluten",
    "viandas celíacos",
    "pastelería sin TACC",
    "pan sin gluten Argentina",
  ],
}

export default function EmprendimientosLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
