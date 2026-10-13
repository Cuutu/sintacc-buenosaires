"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { PlusCircle } from "lucide-react"

/** Rutas que ya tienen su propio llamado a sugerir (o son el formulario). */
const HIDDEN_ON = new Set(["/", "/sugerir", "/sugerir-emprendimiento"])

/** Franja terracota antes del pie, con la misma voz que la de inicio. */
export function FooterCta() {
  const pathname = usePathname()
  if (HIDDEN_ON.has(pathname ?? "")) return null

  return (
    <section className="px-4 pb-10 pt-2 md:px-5 md:pb-16" aria-labelledby="footer-cta-heading">
      <div className="celi-trigo-crema mx-auto flex max-w-5xl flex-col gap-5 rounded-[30px] bg-[#B84420] px-[26px] py-7 md:flex-row md:items-center md:justify-between md:gap-10 md:px-12 md:py-10">
        <div className="min-w-0 md:max-w-xl">
          <h2
            id="footer-cta-heading"
            className="font-serif text-[30px] font-medium italic leading-[1.04] tracking-[-0.02em] text-[#F7F3EB] md:text-[42px]"
          >
            ¿Conocés un lugar sin gluten?
          </h2>
          <p className="mt-2.5 text-[15px] leading-relaxed text-white/90 md:text-lg">
            Sugerilo. Lo revisamos y lo sumamos al mapa para que más personas lo encuentren.
          </p>
        </div>
        <Link
          href="/sugerir"
          className="inline-flex h-[52px] w-full shrink-0 items-center justify-center gap-2 rounded-[17px] bg-[#F7F3EB] px-6 text-[15px] font-extrabold text-[#9A3A1B] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7F3EB]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#B84420] md:w-auto"
        >
          <PlusCircle className="h-5 w-5" strokeWidth={2} aria-hidden />
          Sugerir un lugar
        </Link>
      </div>
    </section>
  )
}
