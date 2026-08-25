import Link from "next/link"

const STEPS = [
  {
    n: "01",
    title: "Abrí el mapa",
    body: "Buscá por barrio, ciudad o tu ubicación.",
  },
  {
    n: "02",
    title: "Revisá el nivel de seguridad",
    body: "Mirá si es 100% sin gluten o con opciones.",
  },
  {
    n: "03",
    title: "Leé y confirmá",
    body: "Usá reseñas como guía y confirmá en el local.",
  },
] as const

export function HowItWorks() {
  return (
    <section aria-labelledby="how-heading">
      <h2
        id="how-heading"
        className="mb-8 text-center font-display text-2xl font-bold text-olive md:mb-10 md:text-[1.75rem]"
      >
        Cómo funciona
      </h2>
      <ol className="grid gap-8 md:grid-cols-3 md:gap-12">
        {STEPS.map((step) => (
          <li key={step.n} className="text-center md:text-left">
            <p className="font-serif text-4xl italic leading-none text-terracotta/80">{step.n}</p>
            <h3 className="mt-3 font-display text-lg font-bold text-olive">{step.title}</h3>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-[#4D6554] md:max-w-none">
              {step.body}
            </p>
          </li>
        ))}
      </ol>
      <p className="mt-8 text-center text-sm text-[#4D6554]">
        Más detalle en{" "}
        <Link href="/como-funciona" className="font-medium text-olive underline-offset-2 hover:underline">
          cómo funciona CeliMap
        </Link>
        .
      </p>
    </section>
  )
}
