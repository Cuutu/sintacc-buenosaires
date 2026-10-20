/**
 * Sistema de botones de la home (revisión 20/10): tres tipos, un solo redondeo
 * (16 px) y dos alturas: 48 px los botones, 44 px los chips y links.
 * - primary: la acción principal de cada bloque. Terracota oscuro (AA).
 * - secondary: con borde, verde (o crema sobre fondo verde).
 * - link: texto subrayado con zona de toque de 44 px.
 */
const base =
  "inline-flex items-center justify-center gap-2 rounded-[16px] px-6 font-extrabold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"

export const homeBtn = {
  primary: `${base} h-12 bg-[#B84420] text-[15px] text-white hover:bg-[#9A3A1B] focus-visible:ring-[#B84420]/40 focus-visible:ring-offset-[#F7F3EB]`,
  secondary: `${base} h-12 border border-[#2D4A34]/25 bg-transparent text-[15px] text-[#2D4A34] hover:bg-[#2D4A34]/5 focus-visible:ring-[#2D4A34]/30 focus-visible:ring-offset-[#F7F3EB]`,
  secondaryOnDark: `${base} h-12 border border-[#F7F3EB]/40 bg-transparent text-[15px] text-[#F7F3EB] hover:bg-[#F7F3EB]/10 focus-visible:ring-[#F7F3EB]/60 focus-visible:ring-offset-[#2D4A34]`,
  link: "inline-flex min-h-[44px] items-center gap-1.5 text-sm font-extrabold text-[#2D4A34] underline decoration-[#2D4A34]/30 underline-offset-4 transition-colors hover:text-[#B84420] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D4A34]/30",
  linkOnDark:
    "inline-flex min-h-[44px] items-center gap-1.5 text-sm font-extrabold text-[#F7F3EB] underline decoration-[#F7F3EB]/40 underline-offset-4 transition-colors hover:decoration-[#F7F3EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7F3EB]/60",
} as const

/**
 * Espacio fijo entre secciones: cada una lleva la mitad arriba y abajo, así dos
 * seguidas quedan a 64 px en el celular y a 96 px en compu.
 */
export const homeSection = "px-4 py-8 md:px-5 md:py-12"
