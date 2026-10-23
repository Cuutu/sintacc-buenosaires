import type { Metadata } from "next"

export const metadata: Metadata = {
  // Objeto: con un texto, /local/escanear y las demás quedaban sin "| CeliMap".
  title: { default: "Panel del local", template: "%s | CeliMap" },
  robots: { index: false, follow: false, nocache: true },
}

export default function LocalLayout({ children }: { children: React.ReactNode }) {
  return children
}
