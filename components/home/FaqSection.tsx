import { HelpCircle, ChevronDown } from "lucide-react"

export const FAQ_ITEMS = [
  {
    question: "¿Qué es CeliMap?",
    answer:
      "CeliMap es un mapa y guía colaborativa para encontrar lugares sin TACC o con opciones aptas para personas celíacas. Permite descubrir restaurantes, cafeterías, panaderías, heladerías, tiendas y emprendimientos, guardar lugares, crear listas y compartir experiencias.",
  },
  {
    question: "¿Hay un mapa para celíacos en Argentina?",
    answer:
      "Sí. CeliMap tiene un mapa interactivo y páginas por ciudad (Buenos Aires, La Plata, Córdoba, Rosario, San Miguel de Tucumán y más). La cobertura depende de los lugares cargados y aportados por la comunidad.",
  },
  {
    question: "¿Dónde comer sin gluten?",
    answer:
      "Podés abrir el mapa o las guías por ciudad. Cuando hay datos, las fichas distinguen lugares 100% libres de gluten de lugares con opciones sin TACC. Siempre confirmá en el local protocolos y contaminación cruzada.",
  },
  {
    question: "¿CeliMap garantiza que un lugar sea seguro?",
    answer:
      "No. La información puede venir de la comunidad y de datos cargados en el mapa. Usá reseñas y clasificaciones como guía, y confirmá siempre en el local antes de comer.",
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
