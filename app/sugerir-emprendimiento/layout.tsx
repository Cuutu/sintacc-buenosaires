import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Sugerir emprendimiento sin gluten",
  description:
    "¿Conocés una marca o proyecto sin gluten? Sugerilo para que la comunidad celíaca lo descubra.",
}

export default function SugerirEmprendimientoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
