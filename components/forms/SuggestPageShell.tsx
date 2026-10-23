import type { ReactNode } from "react"
import { listsUi } from "@/components/lists/lists-ui"

/**
 * Páginas para sugerir (lugar y emprendimiento), revisión 23/10: el mismo encabezado
 * que Guardados y el perfil (frase en cursiva + título grande) y el formulario en un
 * contenedor. Va en el layout (servidor): el h1 sale en el HTML aunque el formulario
 * sea del cliente y espere la sesión.
 */
export function SuggestPageShell({
  kicker,
  title,
  intro,
  children,
}: {
  kicker: string
  title: string
  intro?: string
  children: ReactNode
}) {
  return (
    <div className="container mx-auto max-w-xl px-4 pb-14 pt-6 md:pt-10">
      <header className="mb-6">
        <p className={listsUi.kicker}>{kicker}</p>
        <h1 className={listsUi.title}>{title}</h1>
        {intro ? <p className="mt-3 text-base text-[#5E6A60] [text-wrap:pretty]">{intro}</p> : null}
      </header>
      <div className="rounded-[22px] bg-white p-5 shadow-[0_10px_26px_-22px_rgba(31,42,34,0.5),0_0_0_1px_rgba(45,74,52,0.07)] md:p-7">
        {children}
      </div>
    </div>
  )
}
