import type { Metadata } from "next"
import { headers } from "next/headers"
import Link from "next/link"
import { notFound } from "next/navigation"
import { AddToWalletButton } from "@/components/wallet/AddToWalletButton"
import { LoyaltyCardPreview } from "@/components/wallet/StampDots"
import { BADGE_TRADEMARK, walletBadges } from "@/lib/wallet/badges"
import { isApplePassConfigured, isGoogleWalletConfigured } from "@/lib/wallet/config"
import { findInviterCard, getProgramWithPlace } from "@/lib/wallet/loyalty"
import { activeNotice } from "@/lib/wallet/notice"
import { doubleStampText } from "@/lib/wallet/promos"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Tarjeta de sellos",
  robots: { index: false, follow: false, nocache: true },
}

type Props = { params: { programaId: string }; searchParams?: { amigo?: string | string[] } }

/** A esta página llega el cliente escaneando el cartel con QR de la caja del local. */
export default async function TarjetaPage({ params, searchParams }: Props) {
  const data = await getProgramWithPlace(params.programaId)
  if (!data || !data.program.active) notFound()
  const { program, placeName, placePath, safety } = data
  const programId = program._id.toString()
  const notice = activeNotice(program.notice)
  const doubleStamp = doubleStampText(program.doubleStamp)

  // "Traé un amigo": el link del amigo pasa a los botones, y la tarjeta nueva lo recuerda.
  const amigo = typeof searchParams?.amigo === "string" ? searchParams.amigo : null
  const inviter = await findInviterCard(program, amigo)
  const query = inviter ? `?amigo=${inviter.toString()}` : ""

  // En el celu mostramos sólo el Wallet que tiene; en la compu, los dos.
  const userAgent = headers().get("user-agent") ?? ""
  const isAndroid = /android/i.test(userAgent)
  const isIos = /iphone|ipad|ipod/i.test(userAgent)
  const showApple = isApplePassConfigured() && !isAndroid
  const showGoogle = isGoogleWalletConfigured() && !isIos
  const badges = walletBadges({ apple: showApple, google: showGoogle })

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col gap-6 px-4 py-10">
      <header>
        <p className="font-serif text-lg italic text-terracotta">Tu tarjeta de sellos</p>
        <h1 className="mt-1 text-2xl font-bold text-olive">{placeName}</h1>
        <p className="mt-2 text-olive/80">
          Juntá {program.stampsForReward} sellos y te llevás: <strong>{program.reward}</strong>.
          Mostrá la tarjeta al pagar y el local te suma un sello.
        </p>
        {doubleStamp && (
          <p className="mt-3 rounded-2xl bg-[#FBE9E2] px-3 py-2 text-sm font-semibold text-[#B84420]">
            {doubleStamp}
          </p>
        )}
      </header>

      {inviter && (
        <p className="rounded-2xl border border-dashed border-[#D4633A] bg-[#FBE9E2] p-4 text-olive">
          <strong className="block text-[#B84420]">Te invitó un amigo</strong>
          Guardá la tarjeta y, cuando sumes tu primer sello, te regalamos uno más. Tu amigo también gana uno.
        </p>
      )}

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

      <div className="flex flex-col gap-3">
        {showApple && (
          <AddToWalletButton wallet="apple" href={`/api/wallet/tarjeta/${programId}/apple${query}`} badge={badges.apple} />
        )}
        {showGoogle && (
          <AddToWalletButton wallet="google" href={`/api/wallet/tarjeta/${programId}/google${query}`} badge={badges.google} />
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

      {(badges.apple || badges.google) && (
        <p className="text-center text-[11px] leading-snug text-olive/50">
          {[badges.apple && BADGE_TRADEMARK.apple, badges.google && BADGE_TRADEMARK.google].filter(Boolean).join(" ")}
        </p>
      )}
    </main>
  )
}
