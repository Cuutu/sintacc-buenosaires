import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Encabezado de las secciones de la home: bajada en Fraunces itálica terracota,
 * título extrabold oliva, texto opcional y una acción a la derecha. Todas las
 * secciones de contenido lo usan para que tengan el mismo tamaño y alineación.
 */
export function HomeSectionHeader({
  id,
  kicker,
  title,
  description,
  action,
  className,
}: {
  id: string
  kicker?: string
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("mb-5 flex items-end justify-between gap-4 md:mb-8", className)}>
      <div className="min-w-0">
        {kicker ? (
          <p className="font-serif text-lg font-medium italic text-[#B84420]">{kicker}</p>
        ) : null}
        <h2
          id={id}
          className="mt-0.5 text-[28px] font-extrabold leading-[1.05] tracking-[-0.035em] text-olive [text-wrap:balance] md:text-4xl"
        >
          {title}
        </h2>
        {description ? (
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-[#4D6554]">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
