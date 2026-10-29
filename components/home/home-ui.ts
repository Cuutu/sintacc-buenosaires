/**
 * Escala tipográfica de la home (revisión 20/10; antes había ~26 combinaciones):
 * - Títulos: el del hero, H2 de 28/36 px y H3 de 18 px, en extrabold.
 * - Texto: 16 px el cuerpo y los botones, 14 px lo secundario y los links, 12 px las
 *   etiquetas y los datos chicos.
 * - Pesos de Nunito: normal (400), bold (700) y extrabold (800).
 * - Fraunces itálica: solo el acento del hero, las bajadas y los nombres de los destacados.
 */

/**
 * Sistema de botones de la home (revisión 20/10): tres tipos, un solo redondeo
 * (16 px) y dos alturas: 48 px los botones, 44 px los chips y links. La excepción es
 * `heroMap`, que va al lado del buscador y copia su alto y su redondeo.
 * - primary: la acción principal de cada bloque. Terracota oscuro (AA).
 * - secondary: con borde, verde (o crema sobre fondo verde).
 * - link: texto subrayado con zona de toque de 44 px.
 */
const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[16px] px-6 font-extrabold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"

export const homeBtn = {
  primary: `${base} h-12 bg-[#B84420] text-base text-white hover:bg-[#9A3A1B] focus-visible:ring-[#B84420]/40 focus-visible:ring-offset-[#F7F3EB]`,
  secondary: `${base} h-12 border border-[#2D4A34]/25 bg-transparent text-base text-[#2D4A34] hover:bg-[#2D4A34]/5 focus-visible:ring-[#2D4A34]/30 focus-visible:ring-offset-[#F7F3EB]`,
  secondaryOnDark: `${base} h-12 border border-[#F7F3EB]/40 bg-transparent text-base text-[#F7F3EB] hover:bg-[#F7F3EB]/10 focus-visible:ring-[#F7F3EB]/60 focus-visible:ring-offset-[#2D4A34]`,
  /**
   * "Explorar el mapa" en el hero (revisión 29/10): a la altura del buscador (60/64 px) y
   * con su mismo redondeo, crema con borde sobre el verde. Buscar sigue siendo el único
   * terracota; este queda como la segunda opción, a la vista y sin competir.
   */
  heroMap:
    "inline-flex h-[60px] w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[20px] border-2 border-[#F7F3EB]/55 bg-[#F7F3EB]/10 px-6 text-base font-extrabold text-[#F7F3EB] transition-colors hover:border-[#F7F3EB]/80 hover:bg-[#F7F3EB]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7F3EB]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#2D4A34] md:h-[64px] md:w-auto",
  link: "inline-flex min-h-[44px] items-center gap-1.5 text-sm font-extrabold text-[#2D4A34] underline decoration-[#2D4A34]/30 underline-offset-4 transition-colors hover:text-[#B84420] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D4A34]/30",
  linkOnDark:
    "inline-flex min-h-[44px] items-center gap-1.5 text-sm font-extrabold text-[#F7F3EB] underline decoration-[#F7F3EB]/40 underline-offset-4 transition-colors hover:decoration-[#F7F3EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7F3EB]/60",
} as const

/**
 * Espacio fijo entre secciones: cada una lleva la mitad arriba y abajo, así dos
 * seguidas quedan a 64 px en el celular y a 96 px en compu.
 */
export const homeSection = "px-4 py-8 md:px-5 md:py-12"
