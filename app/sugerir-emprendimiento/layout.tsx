import type { Metadata } from "next"
import { SuggestPageShell } from "@/components/forms/SuggestPageShell"

export const metadata: Metadata = {
  title: "Sugerir emprendimiento sin gluten",
  description:
    "¿Conocés una marca o proyecto sin gluten? Sugerilo para que la comunidad celíaca lo descubra.",
  robots: { index: false, follow: true },
}

export default function SugerirEmprendimientoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SuggestPageShell
      kicker="sumá un emprendimiento"
      title="¿Conocés un emprendimiento sin gluten?"
      intro="Ayudanos a sumar marcas y proyectos que le hacen la vida más fácil a la comunidad celíaca."
    >
      {children}
    </SuggestPageShell>
  )
}
