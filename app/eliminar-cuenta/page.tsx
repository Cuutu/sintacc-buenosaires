import type { Metadata } from "next"
import Link from "next/link"
import { getBaseUrl } from "@/lib/base-url"

const BASE_URL = getBaseUrl()
const PATH = "/eliminar-cuenta"

const title = "Eliminar tu cuenta de CeliMap"
const description =
  "Podés eliminar tu cuenta y los datos asociados directamente desde la aplicación CeliMap, sin necesidad de contactar a soporte."

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${BASE_URL}${PATH}` },
  openGraph: {
    title,
    description,
    url: `${BASE_URL}${PATH}`,
    type: "website",
  },
  robots: { index: true, follow: true },
}

const STEPS = [
  "Ingresá a tu cuenta de CeliMap.",
  "Abrí tu perfil.",
  "Desplazate hasta la sección “Eliminar cuenta”.",
  "Presioná “Eliminar mi cuenta” y confirmá la eliminación.",
]

export default function EliminarCuentaPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12 md:py-16">
      <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-primary">
        Cuenta
      </p>
      <h1 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
        {title}
      </h1>
      <p className="mb-10 text-sm leading-7 text-muted-foreground md:text-[15px]">
        Podés eliminar tu cuenta y los datos asociados directamente desde la
        aplicación, sin necesidad de contactar a soporte.
      </p>

      <section className="scroll-mt-24">
        <h2 className="mb-3 text-lg font-semibold text-foreground">Pasos</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-7 text-muted-foreground md:text-[15px]">
          {STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <p className="mt-8 text-sm leading-7 text-muted-foreground md:text-[15px]">
        La eliminación de la cuenta se realiza desde la aplicación. Al confirmar,
        se eliminarán los datos asociados a tu cuenta según la{" "}
        <Link
          href="/politica-de-privacidad"
          className="font-medium text-primary hover:underline"
        >
          política de privacidad
        </Link>{" "}
        de CeliMap.
      </p>

      <p className="mt-12 text-sm text-muted-foreground">
        <Link href="/" className="font-medium text-primary hover:underline">
          Volver al inicio
        </Link>
        {" · "}
        <Link
          href="/politica-de-privacidad"
          className="font-medium text-primary hover:underline"
        >
          Política de privacidad
        </Link>
      </p>
    </main>
  )
}
