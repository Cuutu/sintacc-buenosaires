import Link from "next/link"
import { Plus } from "lucide-react"

/** Llamado a sugerir lugares: bloque terracota con textura de trigo. */
export function HomeSuggestBand() {
  return (
    <section aria-labelledby="home-suggest-heading" className="px-4 md:px-5">
      <div className="celi-trigo-crema container mx-auto max-w-5xl rounded-[30px] bg-[#B84420] px-[26px] pb-[26px] pt-[30px] md:px-12 md:py-12">
        <h2
          id="home-suggest-heading"
          className="font-serif text-[34px] font-medium italic leading-[1.02] tracking-[-0.02em] text-[#F7F3EB] md:text-5xl"
        >
          ¿Falta tu lugar favorito?
        </h2>
        <p className="mt-3 max-w-[480px] text-[15px] leading-relaxed text-white/90 md:text-lg">
          Sugerilo. Lo revisamos y lo sumamos al mapa para toda la comunidad.
        </p>
        <Link
          href="/sugerir"
          className="mt-5 inline-flex h-[50px] items-center gap-2 rounded-[17px] bg-[#F7F3EB] px-5 text-[15px] font-extrabold text-[#9A3A1B] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7F3EB]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#B84420]"
        >
          <Plus className="h-[18px] w-[18px]" strokeWidth={2.4} aria-hidden />
          Sugerir un lugar
        </Link>
      </div>
    </section>
  )
}
