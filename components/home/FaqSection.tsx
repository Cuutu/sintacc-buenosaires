import { ChevronDown } from "lucide-react"

export const FAQ_ITEMS = [
  {
    question: "¿Qué es CeliMap?",
    answer:
      "CeliMap es un mapa colaborativo para personas celíacas en Argentina. Reúne restaurantes, cafeterías, panaderías, heladerías, tiendas y otros lugares con información sobre opciones sin TACC.\n\nLa comunidad carga lugares, deja reseñas y actualiza datos. También podés guardar favoritos, armar listas y sugerir un sitio que todavía no está en el mapa.\n\nNo reemplaza la consulta en el local: sirve para descubrir opciones y llegar con más contexto.",
  },
  {
    question: "¿Hay un mapa para celíacos en Argentina?",
    answer:
      "Sí. CeliMap tiene un mapa interactivo para buscar por ciudad, barrio o tu ubicación. Hay cobertura en Buenos Aires, La Plata, Córdoba, Rosario, San Miguel de Tucumán y otras ciudades, según lo que la comunidad fue sumando.\n\nCada ficha puede incluir dirección, clasificación (100% sin gluten u opciones sin TACC), fotos, reseñas y datos de contacto cuando están cargados.\n\nLa cobertura no es uniforme: hay barrios con muchos lugares y otros con pocos. Si conocés uno que falta, podés sugerirlo.",
  },
  {
    question: "¿Dónde comer sin gluten?",
    answer:
      "Abrí el mapa o usá el buscador de la home. Podés filtrar por tipo de lugar (restaurantes, cafés, panaderías, tiendas, heladerías) y leer la ficha antes de ir.\n\nCuando hay datos, distinguimos dos situaciones distintas: lugares que se presentan como 100% libres de gluten, y lugares con opciones sin TACC en un menú que también tiene gluten. No es lo mismo, y conviene leer esa diferencia con calma.\n\nAunque la ficha se vea completa, preguntá en el local por contaminación cruzada, harinas, frituras y cómo preparan el plato. La decisión final es siempre tuya y del lugar.",
  },
  {
    question: "¿CeliMap garantiza que un lugar sea seguro?",
    answer:
      "No. CeliMap no certifica locales, no audita cocinas y no garantiza que un lugar sea seguro para todas las personas celíacas.\n\nLa información puede venir de aportes de la comunidad, de datos cargados en el mapa y, cuando existe, de reseñas o calificaciones públicas. Usala como guía para orientar la búsqueda, no como un sello de seguridad.\n\nAntes de comer, confirmá en el local los protocolos, los ingredientes y el riesgo de contaminación cruzada. Si algo no te cierra, no comas ahí.",
  },
  {
    question: "¿Qué diferencia hay entre 100% sin gluten y opciones sin TACC?",
    answer:
      "“100% sin gluten” en CeliMap indica que el lugar figura como dedicado o con señales de menú o cocina orientada por completo a sin gluten, según la información cargada. No es una certificación médica ni una auditoría hecha por CeliMap.\n\n“Opciones sin TACC” significa que el lugar también trabaja gluten: puede tener platos o productos aptos, pero el resto del menú no lo es. El riesgo de contaminación cruzada suele ser distinto.\n\nEn ambos casos preguntá cómo preparan la comida el día que vas. La etiqueta del mapa es un punto de partida.",
  },
  {
    question: "¿CeliMap es gratis? ¿Necesito una cuenta?",
    answer:
      "Sí, explorar el mapa, las fichas y las páginas por ciudad es gratis y no hace falta cuenta.\n\nPara guardar favoritos, crear listas o dejar reseñas sí tenés que iniciar sesión. Así cada persona recupera lo que guardó en el celular o en la computadora.\n\nSugerir un lugar también se puede hacer desde la web; algunos aportes piden cuenta para evitar spam.",
  },
  {
    question: "¿Cómo agrego un lugar que falta?",
    answer:
      "Entrá a Sugerir un lugar, completá el nombre, la dirección y lo que sepas sobre opciones sin TACC. El equipo revisa la sugerencia antes de publicarla en el mapa.\n\nCuanto más preciso el dato (barrio, tipo de lugar, si es 100% o con opciones), más útil queda la ficha para otras personas celíacas.\n\nSi el lugar ya está y ves un error, reportalo desde la ficha o escribinos. Los mapas viven de correcciones, no solo de altas nuevas.",
  },
  {
    question: "¿Puedo guardar lugares y armar listas?",
    answer:
      "Sí. Con cuenta podés marcar favoritos y crear listas: un viaje, un barrio, cumpleaños, lo que necesites.\n\nLas listas pueden ser privadas (se comparten con un enlace, no aparecen en buscadores) o públicas (pueden figurar en el directorio de listas).\n\nSirve para no perder un café que te funcionó o para pasarle opciones a alguien de la familia.",
  },
  {
    question: "¿Qué son los emprendimientos?",
    answer:
      "Además de restaurantes y cafés, CeliMap muestra emprendimientos: panificados, pastas, viandas u otros productos pensados para celíacos, muchas veces de venta online o por encargo.\n\nTienen una sección propia. Ahí podés ver de qué se trata el proyecto y, si hay datos, cómo contactarlos.\n\nComo en el resto del mapa, la ficha informa: no reemplaza preguntar rótulos e ingredientes al productor.",
  },
  {
    question: "¿Qué hago si un dato está mal o desactualizado?",
    answer:
      "Los lugares cambian de dueño, de menú y de protocolo. Si ves algo incorrecto, reportalo en la ficha o contactá al equipo.\n\nUna reseña reciente también ayuda: contá qué preguntaste, qué te dijeron y cómo te sentiste. Eso le sirve a la siguiente persona más que una estrella suelta.\n\nCeliMap corrige con lo que la comunidad y las visitas van aportando. No hay un inspector en cada cocina.",
  },
  {
    question: "¿Hay opciones en ciudades chicas o solo en las grandes?",
    answer:
      "La cobertura no es uniforme. Hay fichas en varias ciudades de Argentina, no solo en Buenos Aires, pero algunas zonas tienen pocos lugares cargados.\n\nSi conocés un comercio en una ciudad chica o un barrio poco cubierto, sugerilo. El mapa crece con esas altas, no con un censo nacional.\n\nMientras tanto podés mirar el directorio por ciudad o provincia y el mapa, sin asumir que “no hay nada” si la ficha todavía no existe.",
  },
  {
    question: "¿Por qué usar CeliMap y no solo Google Maps o Instagram?",
    answer:
      "Google Maps e Instagram sirven para llegar y ver fotos. No están pensados para clasificar un local 100% libre de gluten frente a uno con algunas opciones, ni para reportes de contaminación cruzada.\n\nCeliMap es un mapa colaborativo con fichas, filtros y páginas por ciudad en Argentina. No reemplaza preguntar en el local ni a una asociación médica.\n\nSi tu duda es comprar envasados de marca, el supermercado sigue siendo el canal de góndola; CeliMap apunta a tiendas y emprendimientos listados.",
  },
  {
    question: "¿Dónde compro productos Sin TACC?",
    answer:
      "Los envasados de marca se compran en supermercados y dietéticas, leyendo el rótulo. CeliMap no es Jumbo, Coto ni Carrefour.\n\nPara tiendas y productores cargados por la comunidad, usá las tiendas del mapa y la sección de emprendimientos.\n\nConfirmá ingredientes y manipulación con el comercio: la ficha orienta, no certifica.",
  },
] as const

type FaqItemData = (typeof FAQ_ITEMS)[number]

function FaqItem({ item, defaultOpen = false }: { item: FaqItemData; defaultOpen?: boolean }) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-[24px] border border-olive/10 bg-cream-card shadow-soft [&[open]]:border-olive/20"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 select-none [&::-webkit-details-marker]:hidden">
        <span className="pr-2 font-semibold leading-snug text-olive">{item.question}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-olive/40 transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div className="space-y-3 px-5 pb-5">
        {item.answer.split("\n\n").map((paragraph, index) => (
          <p key={index} className="text-sm leading-relaxed text-[#4D6554] md:text-[15px]">
            {paragraph}
          </p>
        ))}
      </div>
    </details>
  )
}

export function FaqSection() {
  const mid = Math.ceil(FAQ_ITEMS.length / 2)
  const left = FAQ_ITEMS.slice(0, mid)
  const right = FAQ_ITEMS.slice(mid)

  return (
    <section className="px-4 py-12 md:py-16" aria-label="Preguntas frecuentes">
      <div className="container mx-auto max-w-5xl">
        <h2 className="mb-6 text-center font-display text-2xl font-bold text-olive md:mb-8">
          Preguntas frecuentes
        </h2>
        <div className="grid items-start gap-3 md:grid-cols-2 md:gap-x-4">
          <div className="flex flex-col gap-3">
            {left.map((item, i) => (
              <FaqItem key={item.question} item={item} defaultOpen={i === 0} />
            ))}
          </div>
          <div className="flex flex-col gap-3">
            {right.map((item) => (
              <FaqItem key={item.question} item={item} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
