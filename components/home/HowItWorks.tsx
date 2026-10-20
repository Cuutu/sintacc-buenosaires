import Link from "next/link"
import { HomeSectionHeader } from "@/components/home/HomeSectionHeader"
import { homeBtn } from "@/components/home/home-ui"

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
      <HomeSectionHeader id="how-heading" kicker="en tres pasos" title="Cómo funciona" />
      <ol className="grid gap-6 md:grid-cols-3 md:gap-12">
        {STEPS.map((step) => (
          <li key={step.n} className="grid grid-cols-[52px_1fr] items-start gap-x-2 md:block">
            <p className="row-span-2 font-serif text-4xl italic leading-none text-[#B84420]" aria-hidden>
              {step.n}
            </p>
            <h3 className="text-lg font-extrabold text-olive md:mt-3">{step.title}</h3>
            <p className="mt-1 text-base leading-relaxed text-[#4D6554] md:mt-2">{step.body}</p>
          </li>
        ))}
      </ol>
      <p className="mt-6">
        <Link href="/como-funciona" className={homeBtn.link}>
          Más sobre cómo funciona CeliMap
        </Link>
      </p>
    </section>
  )
}
