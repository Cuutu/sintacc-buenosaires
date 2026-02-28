import { HelpCircle, ChevronDown } from "lucide-react"

const FAQ_ITEMS = [
  {
    question: "¿Qué es el mapa para celíacos?",
    answer:
      "Celimap es una plataforma global donde la comunidad comparte restaurantes, cafés y panaderías sin TACC en cualquier parte del mundo. Podés ver el mapa interactivo, filtrar por zona y nivel de seguridad, y leer reseñas de otros celíacos.",
  },
  {
    question: "¿Dónde comer sin gluten?",
    answer:
      "En Celimap encontrás el mapa de lugares sin gluten sin restricción geográfica. Incluye restaurantes 100% sin TACC, cafés con opciones aptas y panaderías certificadas. Cada lugar tiene reseñas de la comunidad celíaca.",
  },
  {
    question: "¿Cómo saber si un lugar es seguro para celíacos?",
    answer:
      "En Celimap cada lugar tiene un nivel de seguridad: 100% sin gluten (dedicado) u opciones sin gluten. Las reseñas de la comunidad te ayudan a decidir. También podés reportar si tuviste una experiencia de contaminación.",
  },
]

export function FaqSection() {
  return (
    <section
      className="container mx-auto px-4 py-12 md:py-16 border-t border-border/50 scroll-mt-20"
      aria-label="Preguntas frecuentes"
    >
      <div className="max-w-2xl mx-auto">
        {/* Header */}
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

        {/* Accordion FAQ */}
        <div className="space-y-3">
          {FAQ_ITEMS.map((item, i) => (
            <details
              key={i}
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
