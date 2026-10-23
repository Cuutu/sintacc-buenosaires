import type { Metadata } from "next"

/** Página personal: título propio ("Mi perfil | CeliMap") y fuera de los buscadores. */
export const metadata: Metadata = {
  title: "Mi perfil",
  robots: { index: false, follow: false },
}

export default function PerfilLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
