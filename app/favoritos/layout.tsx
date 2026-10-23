import type { Metadata } from "next"

/** Página personal: título propio ("Guardados | CeliMap") y fuera de los buscadores. */
export const metadata: Metadata = {
  title: "Guardados",
  robots: { index: false, follow: false },
}

export default function FavoritosLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
