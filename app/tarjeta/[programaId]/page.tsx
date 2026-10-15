import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { LoyaltyCardPreview } from "@/components/wallet/StampDots"
import { getProgramWithPlace } from "@/lib/wallet/loyalty"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Tarjeta de sellos",
  robots: { index: false, follow: false, nocache: true },
}

type Props = { params: { programaId: string } }

/** A esta página llega el cliente escaneando el cartel con QR de la caja del local. */
export default async function TarjetaPage({ params }: Props) {
  const data = await getProgramWithPlace(params.programaId)
  if (!data || !data.program.active) notFound()
  const { program, placeName, placePath } = data

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col gap-6 px-4 py-10">
      <header>
        <p className="font-serif text-lg italic text-terracotta">Tu tarjeta de sellos</p>
        <h1 className="mt-1 text-2xl font-bold text-olive">{placeName}</h1>
        <p className="mt-2 text-olive/80">
          Juntá {program.stampsForReward} sellos y te llevás: <strong>{program.reward}</strong>.
          Mostrá la tarjeta al pagar y el local te suma un sello.
        </p>
      </header>

      <LoyaltyCardPreview
        placeName={placeName}
        reward={program.reward}
        stamps={0}
        total={program.stampsForReward}
      />

      {/* <a> y no <Link>: el prefetch crearía tarjetas. */}
      <a
        href={`/api/wallet/tarjeta/${program._id.toString()}/apple`}
        className="flex h-12 items-center justify-center rounded-full bg-black px-6 text-base font-semibold text-white"
      >
        Agregar a Apple Wallet
      </a>
      <p className="text-center text-sm text-olive/70">
        Sin descargar nada y sin crear cuenta. Por ahora funciona en iPhone; en Android llega pronto
        con Google Wallet.
      </p>

      <Link href={placePath} className="text-center text-sm font-semibold text-terracotta-strong underline">
        Ver {placeName} en CeliMap
      </Link>
    </main>
  )
}
