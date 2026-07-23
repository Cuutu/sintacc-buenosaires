import { HelpCircle, ChevronDown } from "lucide-react"

export const FAQ_ITEMS = [
  {
    question: "¿Qué es Celimap?",
    answer:
      "Celimap es un mapa colaborativo para celíacos. Encontrá restaurantes, cafés y panaderías sin tacc en Argentina, con reseñas de la comunidad y filtros por ciudad y barrio.",
  },
  {
    question: "¿Hay un mapa para celíacos en Argentina?",
    answer:
      "Sí. Celimap cubre Buenos Aires, La Plata, Tucumán, Córdoba y más ciudades. Cada lugar tiene reseñas y nivel de seguridad.",
  },
  {
    question: "¿Dónde comer sin gluten?",
    answer:
      "En el mapa de Celimap hay restaurantes 100% sin tacc, cafés con opciones aptas y panaderías certificadas en todo el país.",
  },
  {
    question: "¿Cómo saber si un lugar es seguro para celíacos?",
    answer:
      "Cada lugar muestra su nivel de seguridad: 100% sin gluten, opciones sin tacc, etc. Las reseñas de la comunidad te ayudan a decidir.",
  },
] as const

export function FaqSection() {
  return (
    <section
      className="container mx-auto px-4 py-12 md:py-16 border-t border-border/50 scroll-mt-20"
      aria-label="Preguntas frecuentes"
    >
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col items-center text-center mb-10">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4">
            <HelpCircle className="h-4 w-4" />
            Preguntas frecuentes
          </span>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            Todo lo que necesitás saber
          </h2>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">
            Sobre el mapa para celíacos y cómo usarlo
          </p>
        </div>

        <div className="space-y-3">
          {FAQ_ITEMS.map((item, i) => (
            <details
              key={item.question}
              open={i === 0}
              className="group rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm overflow-hidden transition-all hover:border-primary/30 hover:bg-card/70 [&[open]]:border-primary/40 [&[open]]:bg-card/80"
            >
              <summary className="flex items-center justify-between gap-4 cursor-pointer list-none px-5 py-4 md:px-6 md:py-5 select-none [&::-webkit-details-marker]:hidden">
                <span className="font-semibold text-foreground pr-4">
                  {item.question}
                </span>
                <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <div className="px-5 pb-4 pt-0 md:px-6 md:pb-5 md:pt-0">
                <p className="text-muted-foreground text-sm md:text-base leading-relaxed pl-0">
                  {item.answer}
                </p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
