import type { Metadata } from "next"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { absoluteUrl } from "@/lib/base-url"
import { cn } from "@/lib/utils"
import { LoyaltyPoster } from "@/components/wallet/LoyaltyPoster"
import { PrintButton } from "@/components/wallet/PrintButton"
import { walletBadges } from "@/lib/wallet/badges"
import { isApplePassConfigured, isGoogleWalletConfigured } from "@/lib/wallet/config"
import { canManageProgram, enrollPathFor, getProgramWithPlace } from "@/lib/wallet/loyalty"
import { POSTER_SIZES, parsePosterSize, posterCss, type PosterSize } from "@/lib/wallet/poster-print"

export const dynamic = "force-dynamic"

export const metadata: Metadata = { title: "Cartel con QR" }

type Props = { params: { programaId: string }; searchParams: { tamano?: string } }

/** Cartel con el QR de la tarjeta para imprimir y dejar en la caja. Lo ve el local o un admin. */
export default async function CartelPage({ params, searchParams }: Props) {
  const path = `/local/cartel/${params.programaId}`
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect(`/login?callbackUrl=${encodeURIComponent(path)}`)

  const data = await getProgramWithPlace(params.programaId)
  if (!data || !canManageProgram(data.program, session)) notFound()

  const { program, placeName } = data
  const size = parsePosterSize(searchParams.tamano)
  const wallets = { apple: isApplePassConfigured(), google: isGoogleWalletConfigured() }

  return (
    <>
      {/* CSS fijo, sin datos de nadie. */}
      <style dangerouslySetInnerHTML={{ __html: posterCss(size) }} />

      <div className="mx-auto w-full max-w-3xl px-4 pb-6 pt-8">
        <Link
          href={session.user.role === "admin" ? "/admin/tarjetas" : "/local"}
          className="text-sm font-semibold text-terracotta-strong underline"
        >
          Volver
        </Link>
        <p className="mt-4 font-serif text-lg italic text-terracotta">Cartel para la caja</p>
        <h1 className="mt-1 text-2xl font-bold text-olive">{placeName}</h1>
        <p className="mt-2 text-olive/80">
          El cliente escanea el QR y guarda la tarjeta en su celu. Imprimilo, o en la ventana de impresión
          elegí &quot;Guardar como PDF&quot; para mandarlo por WhatsApp.
        </p>
        {!program.active && (
          <p className="mt-3 rounded-xl bg-[#FBE9E2] p-3 text-sm text-[#B84420]">
            Esta tarjeta está pausada: hasta que la reactives, el QR no abre nada.
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {(Object.keys(POSTER_SIZES) as PosterSize[]).map((key) => (
            <Link
              key={key}
              href={key === "a5" ? path : `${path}?tamano=${key}`}
              replace
              scroll={false}
              aria-current={key === size ? "page" : undefined}
              className={cn(
                "inline-flex h-11 items-center rounded-full border px-4 text-sm font-semibold",
                key === size
                  ? "border-olive bg-olive text-cream"
                  : "border-[#E8E1D6] bg-white text-olive"
              )}
            >
              {POSTER_SIZES[key].label}
            </Link>
          ))}
          <PrintButton label="Imprimir o guardar PDF" />
        </div>
      </div>

      <div className="flex justify-center px-4 pb-12">
        <LoyaltyPoster
          placeName={placeName}
          reward={program.reward}
          stampsForReward={program.stampsForReward}
          safety={data.safety}
          enrollUrl={absoluteUrl(enrollPathFor(program._id.toString()))}
          wallets={wallets}
          badges={walletBadges(wallets)}
        />
      </div>
    </>
  )
}
