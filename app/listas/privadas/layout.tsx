import type { ReactNode } from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Lista privada | CeliMap",
  description: "Contenido privado de CeliMap.",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
}

export default function PrivateListasLayout({
  children,
}: {
  children: ReactNode
}) {
  return children
}
