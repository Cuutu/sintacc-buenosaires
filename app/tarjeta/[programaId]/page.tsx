import type { Metadata } from "next"
import { headers } from "next/headers"
import Link from "next/link"
import { notFound } from "next/navigation"
import { LoyaltyCardPreview } from "@/components/wallet/StampDots"
import { isApplePassConfigured, isGoogleWalletConfigured } from "@/lib/wallet/config"
import { getProgramWithPlace } from "@/lib/wallet/loyalty"
import { activeNotice } from "@/lib/wallet/notice"

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
  const { program, placeName, placePath, safety } = data
  const programId = program._id.toString()
  const notice = activeNotice(program.notice)

  // En el celu mostramos sólo el Wallet que tiene; en la compu, los dos.
  const userAgent = headers().get("user-agent") ?? ""
  const isAndroid = /android/i.test(userAgent)
  const isIos = /iphone|ipad|ipod/i.test(userAgent)
  const showApple = isApplePassConfigured() && !isAndroid
  const showGoogle = isGoogleWalletConfigured() && !isIos

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

      {notice && (
        <p className="rounded-2xl bg-cream-card p-4 text-olive">
          <span className="block text-xs font-semibold uppercase tracking-wide text-olive/60">
            Aviso de {placeName}
          </span>
          {notice}
        </p>
      )}

      <LoyaltyCardPreview
        placeName={placeName}
        reward={program.reward}
        stamps={0}
        total={program.stampsForReward}
        safety={safety}
      />

      {/* <a> y no <Link>: el prefetch crearía tarjetas. */}
      <div className="flex flex-col gap-3">
        {showApple && (
          <a
            href={`/api/wallet/tarjeta/${programId}/apple`}
            className="flex h-12 items-center justify-center rounded-full bg-black px-6 text-base font-semibold text-white"
          >
            Agregar a Apple Wallet
          </a>
        )}
        {showGoogle && (
          <a
            href={`/api/wallet/tarjeta/${programId}/google`}
            className="flex h-12 items-center justify-center rounded-full bg-black px-6 text-base font-semibold text-white"
          >
            Agregar a Google Wallet
          </a>
        )}
      </div>
      <p className="text-center text-sm text-olive/70">
        {showApple || showGoogle
          ? "Sin descargar nada y sin crear cuenta."
          : "Esta tarjeta todavía no está disponible en tu celular."}
      </p>

      <Link href={placePath} className="text-center text-sm font-semibold text-terracotta-strong underline">
        Ver {placeName} en CeliMap
      </Link>
    </main>
  )
}
