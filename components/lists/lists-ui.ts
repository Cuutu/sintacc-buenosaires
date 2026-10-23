import { cn } from "@/lib/utils"

/**
 * Sistema de Guardados y Listas (revisión 23/10), el mismo de la home y /emprendimientos:
 * - primary: la acción principal de la página, terracota (AA).
 * - secondary: borde suave, verde. "⋯" usa el mismo estilo.
 * - pill: filtros y pestañas; la elegida va en verde oscuro.
 * Todo con 44 px de alto como mínimo (zona de toque).
 */
const btnBase =
  "inline-flex h-11 min-w-[44px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[14px] px-4 text-sm font-extrabold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F3EB] disabled:pointer-events-none disabled:opacity-50"

export const listsUi = {
  primary: cn(btnBase, "bg-[#B84420] text-white hover:bg-[#9A3A1B] focus-visible:ring-[#B84420]/40"),
  secondary: cn(
    btnBase,
    "border border-[#2D4A34]/20 bg-white text-[#2D4A34] hover:border-[#2D4A34]/40 hover:bg-[#F7F3EB] focus-visible:ring-[#2D4A34]/30"
  ),
  /** Botón de solo ícono ("⋯"): mismo estilo que el secundario. */
  icon: cn(
    btnBase,
    "w-11 px-0 border border-[#2D4A34]/20 bg-white text-[#2D4A34] hover:border-[#2D4A34]/40 hover:bg-[#F7F3EB] focus-visible:ring-[#2D4A34]/30"
  ),
  /** Link de texto con zona de toque de 44 px. */
  link: "inline-flex min-h-[44px] items-center gap-1.5 text-sm font-extrabold text-[#2D4A34] underline decoration-[#2D4A34]/30 underline-offset-4 transition-colors hover:text-[#B84420] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D4A34]/30",
  /** Encabezado de página: frase en cursiva + título grande. */
  kicker: "font-serif text-lg font-medium italic text-[#B84420] md:text-xl",
  title:
    "mt-1 text-[34px] font-extrabold leading-[1.04] tracking-[-0.035em] text-[#2D4A34] [text-wrap:balance] md:text-[50px]",
  /** Contenedor de las páginas de Guardados y Listas. */
  page: "container mx-auto max-w-5xl px-4 pb-14 pt-6 md:px-5 md:pt-10",
} as const

/** Pestañas y filtros: píldora; la elegida en verde oscuro (como en /emprendimientos). */
export function listsPill(selected: boolean): string {
  return cn(
    "inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-full border px-4 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F4D35]/30",
    selected
      ? "border-[#1F4D35] bg-[#1F4D35] text-[#F8F5EF]"
      : "border-[#E8E1D6] bg-white text-[#1F4D35] hover:border-[#1F4D35]/30"
  )
}

/** Sello sobre la portada ("Pública", "Con enlace", "Privada", "♥ 12"): crema, legible sobre cualquier foto. */
export const listsChip =
  "inline-flex h-7 max-w-full items-center gap-1 rounded-full bg-[#F7F3EB] px-2.5 text-xs font-extrabold text-[#1F4D35] shadow-[0_4px_12px_-6px_rgba(20,30,23,0.45)]"
