import type { Metadata } from "next"
import { headers } from "next/headers"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Gift, Megaphone, Sparkles } from "lucide-react"
import { AddToWalletButton } from "@/components/wallet/AddToWalletButton"
import { LoyaltyCardPreview } from "@/components/wallet/StampDots"
import { BADGE_TRADEMARK, walletBadges } from "@/lib/wallet/badges"
import { CARD_SAFETY_LABEL } from "@/lib/wallet/card-safety"
import { isApplePassConfigured, isGoogleWalletConfigured } from "@/lib/wallet/config"
import { findInviterCard, getProgramWithPlace, newRequestKey } from "@/lib/wallet/loyalty"
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
  // Un código por botón: si lo tocan dos veces, es la misma tarjeta (ver card-request.ts).
  const hrefFor = (wallet: "apple" | "google") => {
    const params = new URLSearchParams({ k: newRequestKey() })
    if (inviter) params.set("amigo", inviter.toString())
    return `/api/wallet/tarjeta/${programId}/${wallet}?${params.toString()}`
  }

  // En el celu mostramos sólo el Wallet que tiene; en la compu, los dos.
  const userAgent = headers().get("user-agent") ?? ""
  const isAndroid = /android/i.test(userAgent)
  const isIos = /iphone|ipad|ipod/i.test(userAgent)
  const showApple = isApplePassConfigured() && !isAndroid
  const showGoogle = isGoogleWalletConfigured() && !isIos
  const badges = walletBadges({ apple: showApple, google: showGoogle })
  const walletName = showApple && !showGoogle ? "Apple Wallet" : showGoogle && !showApple ? "Google Wallet" : "tu Wallet"

  const steps = [
    `Guardala en ${walletName}: queda en el celu, sin app y sin cuenta.`,
    "Mostrala al pagar y el local te suma un sello.",
    `Con ${program.stampsForReward} sellos te llevás ${program.reward}. Te avisamos en el celu.`,
  ]

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col gap-6 px-4 py-10">
      <header className="text-center">
        <p className="font-serif text-lg italic text-terracotta">Tu tarjeta de sellos</p>
        <h1 className="mt-1 text-3xl font-extrabold leading-tight text-olive">{placeName}</h1>
        {safety && (
          <p className="mt-2 inline-flex rounded-full bg-olive/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-olive">
            {CARD_SAFETY_LABEL[safety]}
          </p>
        )}
        <p className="mt-4 text-lg text-olive">
          Juntá <strong>{program.stampsForReward} sellos</strong> y te llevás{" "}
          <strong className="text-terracotta-strong">{program.reward}</strong>.
        </p>
      </header>

      {inviter && (
        <p className="rounded-2xl border border-dashed border-[#D4633A] bg-[#FBE9E2] p-4 text-olive">
          <strong className="flex items-center gap-2 text-[#B84420]">
            <Gift className="h-4 w-4" aria-hidden />
            Te invitó un amigo
          </strong>
          Guardá la tarjeta y, cuando sumes tu primer sello, te regalamos uno más. Tu amigo también gana uno.
        </p>
      )}

      <LoyaltyCardPreview
        placeName={placeName}
        reward={program.reward}
        stamps={0}
        total={program.stampsForReward}
        safety={safety}
      />

      <section className="flex flex-col gap-3" aria-label="Guardar la tarjeta">
        {showApple && (
          <AddToWalletButton wallet="apple" href={hrefFor("apple")} badge={badges.apple} />
        )}
        {showGoogle && (
          <AddToWalletButton wallet="google" href={hrefFor("google")} badge={badges.google} />
        )}
        <p className="text-center text-sm text-olive/70">
          {showApple || showGoogle
            ? "Sin descargar nada y sin crear cuenta."
            : "Esta tarjeta todavía no está disponible en tu celular."}
        </p>
      </section>

      {(doubleStamp || program.referralEnabled || notice) && (
        <section className="flex flex-col gap-3" aria-label="Novedades del local">
          {notice && (
            <Perk icon={<Megaphone className="h-4 w-4" aria-hidden />} title={`Aviso de ${placeName}`}>
              {notice}
            </Perk>
          )}
          {doubleStamp && (
            <Perk icon={<Sparkles className="h-4 w-4" aria-hidden />} title="Sello doble">
              {doubleStamp}
            </Perk>
          )}
          {program.referralEnabled && !inviter && (
            <Perk icon={<Gift className="h-4 w-4" aria-hidden />} title="Traé un amigo">
              Cuando guardes la tarjeta vas a tener un link para invitar amigos. Cuando un amigo suma su primer
              sello, ganan un sello de regalo los dos.
            </Perk>
          )}
        </section>
      )}

      <section className="rounded-2xl bg-cream-card p-5 text-olive">
        <h2 className="font-bold">Cómo funciona</h2>
        <ol className="mt-3 space-y-3">
          {steps.map((step, i) => (
            <li key={step} className="flex gap-3 text-sm">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#B84420] font-bold text-white">
                {i + 1}
              </span>
              <span className="pt-1">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <nav className="flex flex-col items-center gap-2 text-sm font-semibold">
        <Link href={placePath} className="text-terracotta-strong underline">
          Ver {placeName} en CeliMap
        </Link>
        <Link href="/mapa" className="text-olive/80 underline">
          Más lugares sin TACC en el mapa
        </Link>
      </nav>

      {(badges.apple || badges.google) && (
        <p className="text-center text-[11px] leading-snug text-olive/50">
          {[badges.apple && BADGE_TRADEMARK.apple, badges.google && BADGE_TRADEMARK.google].filter(Boolean).join(" ")}
        </p>
      )}
    </main>
  )
}

function Perk({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#E8E1D6] bg-white p-4 text-olive">
      <p className="flex items-center gap-2 font-bold text-[#B84420]">
        {icon}
        {title}
      </p>
      <p className="mt-1 text-sm">{children}</p>
    </div>
  )
}
