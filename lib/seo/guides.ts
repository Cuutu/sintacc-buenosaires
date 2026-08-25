/**
 * Guías editoriales estáticas.
 * status: "draft" → noindex, fuera de sitemap, banner de borrador.
 * status: "published" → indexable cuando se apruebe contenido.
 *
 * No inventar datos médicos ni estadísticas de CeliMap.
 */

export type GuideStatus = "draft" | "published"

export type GuideSection = {
  heading: string
  body: string
}

export type GuideFaq = {
  question: string
  answer: string
}

export type Guide = {
  slug: string
  title: string
  summary: string
  author: string
  publishedAt: string
  updatedAt: string
  status: GuideStatus
  image?: string
  sources: { label: string; url?: string }[]
  sections: GuideSection[]
  faqs: GuideFaq[]
  relatedCitySlugs: string[]
  relatedPlaceIds: string[]
  relatedListIds: string[]
  /** Temas futuros (viajes, aeropuertos, etc.) — solo metadata de arquitectura */
  topicTags: string[]
}

export const GUIDES: Guide[] = [
  {
    slug: "que-significa-100-libre-de-gluten",
    title: "Qué significa que un lugar sea 100% libre de gluten",
    summary:
      "Explicación práctica de la etiqueta “100% libre de gluten” en CeliMap y qué conviene confirmar en el local.",
    author: "Equipo CeliMap",
    publishedAt: "2026-08-12",
    updatedAt: "2026-08-24",
    status: "published",
    sources: [
      { label: "Clasificaciones en CeliMap", url: "/como-verificamos-los-lugares" },
    ],
    sections: [
      {
        heading: "Respuesta directa",
        body: "En CeliMap, “100% libre de gluten” indica que el lugar figura como dedicado o etiquetado con señales de menú/producto íntegramente sin gluten según la información cargada. No equivale a una certificación médica emitida por CeliMap ni a una auditoría sanitaria independiente.",
      },
      {
        heading: "Qué implica en la práctica",
        body: "Suele significar que el local se presenta como espacio o cocina orientada a sin gluten. Aun así, cada persona celíaca tiene distinta sensibilidad: preguntá por manipulación, ingredientes y contaminación cruzada.",
      },
      {
        heading: "Qué no implica",
        body: "No garantiza seguridad absoluta para todas las personas. No reemplaza leer rótulos, preguntar al personal ni conocer tu propio criterio de riesgo.",
      },
      {
        heading: "Cómo usarlo en CeliMap",
        body: "Filtrá o mirá la etiqueta en la ficha, leé reseñas si hay, y contrastá con lo que diga el local el día de tu visita.",
      },
    ],
    faqs: [
      {
        question: "¿CeliMap certifica el “100% libre de gluten”?",
        answer:
          "No. La etiqueta refleja información cargada en el mapa (tags o nivel de seguridad), no una certificación propia de CeliMap.",
      },
      {
        question: "¿Debo preguntar igual en el local?",
        answer:
          "Sí. Confirmá protocolos, ingredientes y contaminación cruzada antes de comer.",
      },
    ],
    relatedCitySlugs: ["buenos-aires", "la-plata", "cordoba"],
    relatedPlaceIds: [],
    relatedListIds: [],
    topicTags: ["clasificacion", "seguridad"],
  },
  {
    slug: "diferencia-sin-tacc-y-opciones-sin-tacc",
    title: "Diferencias entre un lugar sin TACC y uno con opciones sin TACC",
    summary:
      "Cómo distinguir en CeliMap un lugar dedicado de uno que ofrece algunas opciones sin gluten.",
    author: "Equipo CeliMap",
    publishedAt: "2026-08-12",
    updatedAt: "2026-08-24",
    status: "published",
    sources: [
      { label: "Cómo trabajamos la información", url: "/como-verificamos-los-lugares" },
    ],
    sections: [
      {
        heading: "Respuesta directa",
        body: "Un lugar “100% libre de gluten” se presenta como dedicado según los datos de CeliMap. Un lugar “con opciones sin TACC” ofrece parte del menú o surtido apto, dentro de un espacio que también maneja gluten.",
      },
      {
        heading: "Por qué importa la diferencia",
        body: "En locales con opciones, el riesgo de contaminación cruzada suele ser mayor si no hay procesos claros. En dedicados, el riesgo puede ser menor, pero nunca es cero por definición en una app.",
      },
      {
        heading: "Cómo leer las fichas",
        body: "Mirás la clasificación, las reseñas y los reportes visibles. Si falta información, asumí que necesitás preguntar más.",
      },
    ],
    faqs: [
      {
        question: "¿“Opciones sin TACC” es seguro igual?",
        answer:
          "Depende del local y de tu criterio. Preguntá por preparación, utensilios y freidoras compartidas.",
      },
      {
        question: "¿Puede cambiar la clasificación?",
        answer:
          "Sí, si se corrigen datos o el local cambia su oferta. Revisá la ficha actualizada.",
      },
    ],
    relatedCitySlugs: ["rosario", "mendoza", "salta"],
    relatedPlaceIds: [],
    relatedListIds: [],
    topicTags: ["clasificacion"],
  },
  {
    slug: "que-preguntar-en-un-restaurante-si-sos-celiaco",
    title: "Qué preguntar antes de comer en un restaurante si sos celíaco",
    summary:
      "Lista práctica de preguntas para reducir incertidumbre al comer afuera. No es consejo médico.",
    author: "Equipo CeliMap",
    publishedAt: "2026-08-12",
    updatedAt: "2026-08-24",
    status: "published",
    sources: [],
    sections: [
      {
        heading: "Respuesta directa",
        body: "Preguntá cómo preparan el plato, si hay cocina o utensilios separados, qué aceites o parrillas usan, y si el personal entiende celiaquía. Usá CeliMap para elegir candidatos; confirmá en el local.",
      },
      {
        heading: "Preguntas útiles",
        body: "¿Tienen carta sin TACC? ¿Cocinan en sartén/plancha limpia? ¿Comparten freidora? ¿Usan el mismo aceite? ¿Pueden ver el envase del producto? ¿Hay salsas o aderezos con gluten?",
      },
      {
        heading: "Si la respuesta es dudosa",
        body: "Podés elegir otro plato, otro local, o no comer ahí. Tu seguridad importa más que completar la salida.",
      },
    ],
    faqs: [
      {
        question: "¿Alcanza con decir “sin gluten”?",
        answer:
          "Mejor explicar celiaquía y contaminación cruzada. “Sin gluten” a veces se interpreta solo como “sin pan”.",
      },
      {
        question: "¿CeliMap reemplaza estas preguntas?",
        answer: "No. El mapa ayuda a encontrar opciones; la confirmación es en el local.",
      },
    ],
    relatedCitySlugs: ["buenos-aires", "mar-del-plata", "san-miguel-de-tucuman"],
    relatedPlaceIds: [],
    relatedListIds: [],
    topicTags: ["practico", "restaurantes"],
  },
  {
    slug: "reducir-contaminacion-cruzada-al-comer-afuera",
    title: "Cómo reducir el riesgo de contaminación cruzada al comer afuera",
    summary:
      "Hábitos prácticos para bajar riesgo al comer fuera de casa. Orientación general, no tratamiento médico.",
    author: "Equipo CeliMap",
    publishedAt: "2026-08-12",
    updatedAt: "2026-08-24",
    status: "published",
    sources: [
      { label: "Metodología de información en CeliMap", url: "/como-verificamos-los-lugares" },
    ],
    sections: [
      {
        heading: "Respuesta directa",
        body: "Elegí locales con buena comunicación, preguntá por procesos, evitá preparaciones de alto riesgo si no hay claridad (buffets, frituras compartidas, tablas mixtas) y prestá atención a reseñas o reportes recientes en CeliMap.",
      },
      {
        heading: "Señales de cuidado en el local",
        body: "Personal que entiende el pedido, cocina o estación diferenciada, ingredientes identificados y disposición a mostrar envases.",
      },
      {
        heading: "Límites de cualquier mapa",
        body: "Ninguna app elimina el riesgo. CeliMap organiza información colaborativa para decidir mejor, no para garantizar un resultado clínico.",
      },
    ],
    faqs: [
      {
        question: "¿Un lugar 100% libre de gluten elimina el riesgo?",
        answer:
          "Reduce escenarios típicos de contaminación, pero no hay garantía universal. Confirmá siempre procesos actuales.",
      },
      {
        question: "¿Sirven los reportes de la comunidad?",
        answer:
          "Sí como señal adicional. Son experiencias individuales, no un veredicto definitivo.",
      },
    ],
    relatedCitySlugs: ["cordoba", "la-plata", "buenos-aires"],
    relatedPlaceIds: [],
    relatedListIds: [],
    topicTags: ["seguridad", "practico"],
  },
]

/** Slugs reservados para futuras guías (arquitectura lista; sin contenido publicado). */
export const FUTURE_GUIDE_TOPICS = [
  "viajes-sin-tacc",
  "aeropuertos-sin-tacc",
  "alojamientos-aptos-celiacos",
  "estadisticas-celimap",
  "ciudades-guia",
] as const

export function getAllGuides(): Guide[] {
  return GUIDES
}

export function getPublishedGuides(): Guide[] {
  return GUIDES.filter((g) => g.status === "published")
}

export function getGuideBySlug(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug)
}

export function getGuidesRelatedToCity(citySlug: string): Guide[] {
  return GUIDES.filter(
    (g) => g.status === "published" && g.relatedCitySlugs.includes(citySlug)
  )
}

/** Para UI: drafts visibles en /guias con aviso; no indexar. */
export function getGuidesForListing(): Guide[] {
  return GUIDES
}
