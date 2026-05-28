import { Truck, Package, ShieldCheck } from "lucide-react"

const INFO_CARDS = [
  {
    icon: Truck,
    title: "Delivery o retiro",
    text: "Emprendimientos que venden por pedido o entregan en tu zona.",
  },
  {
    icon: Package,
    title: "Productos sin gluten",
    text: "Viandas, tortas, panes, congelados, premezclas y más.",
  },
  {
    icon: ShieldCheck,
    title: "Revisado antes de publicar",
    text: "Las sugerencias pasan por una revisión antes de aparecer en Celimap.",
  },
] as const

export function VenturesExplainer() {
  return (
    <section className="mb-12 md:mb-14">
      <h2 className="text-xl md:text-2xl font-bold mb-3 text-center md:text-left">
        Una sección para emprendimientos que no siempre tienen local
      </h2>
      <p className="text-sm text-muted-foreground leading-relaxed mb-8 text-center md:text-left max-w-3xl">
        No todos los productos sin gluten se encuentran en restaurantes o tiendas físicas. En
        Celimap también queremos visibilizar marcas que venden por encargo, Instagram, WhatsApp,
        delivery, retiro o ferias.
      </p>
      <div className="grid md:grid-cols-3 gap-4">
        {INFO_CARDS.map((card) => (
          <div
            key={card.title}
            className="rounded-xl border border-white/10 bg-white/[0.04] p-5 md:p-6 transition-colors hover:border-primary/20 hover:bg-white/[0.06]"
          >
            <card.icon className="h-8 w-8 text-primary mb-4" aria-hidden />
            <h3 className="font-semibold mb-2">{card.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{card.text}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
