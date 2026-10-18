import Link from "next/link"
import { notFound } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import { LoyaltyCard } from "@/models/LoyaltyCard"
import { LoyaltyCardPreview } from "@/components/wallet/StampDots"
import { StampActions } from "@/components/wallet/StampActions"
import { InviteShare } from "@/components/wallet/InviteShare"
import { getProgramWithPlace, inviteUrlFor, isValidSerial } from "@/lib/wallet/loyalty"
import { canStampProgram, stampPlaceIdsFor } from "@/lib/wallet/branches"
import { doubleStampText, isDoubleStampNow, stampIncrement } from "@/lib/wallet/promos"

export const dynamic = "force-dynamic"

type Props = { params: { serial: string } }

/**
 * Destino del QR de la tarjeta. El local lo escanea con la cámara y suma el sello acá.
 * Si lo abre el propio cliente, sólo ve su tarjeta.
 */
export default async function SellarPage({ params }: Props) {
  if (!isValidSerial(params.serial)) notFound()
  await connectDB()
  const card = await LoyaltyCard.findOne({ serialNumber: params.serial })
  if (!card) notFound()
  const data = await getProgramWithPlace(card.programId.toString())
  if (!data) notFound()

  const session = await getServerSession(authOptions)
  const isStaff = canStampProgram(data.program, session)
  // Sucursales donde esta persona puede sumar (con una sola, no se pregunta).
  const allowed = new Set(stampPlaceIdsFor(data.program, session))
  const stampBranches = data.branches
    .filter((b) => allowed.has(b.placeId))
    .map((b) => ({ id: b.placeId, name: b.name }))
  const total = data.program.stampsForReward
  // Página dinámica (no ISR): la hora del servidor es la de este momento.
  const doubleNow = isDoubleStampNow(data.program.doubleStamp)
  const doubleInfo = doubleStampText(data.program.doubleStamp)

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-10">
      <h1 className="text-2xl font-bold text-olive">{data.placeName}</h1>

      {isStaff ? (
        <StampActions
          serial={card.serialNumber}
          placeName={data.placeName}
          reward={data.program.reward}
          initialStamps={card.stamps}
          total={total}
          safety={data.safety}
          initialNext={stampIncrement(card, data.program)}
          programId={data.program._id.toString()}
          branches={stampBranches}
        />
      ) : (
        <>
          <LoyaltyCardPreview
            placeName={data.placeName}
            reward={data.program.reward}
            stamps={card.stamps}
            total={total}
            safety={data.safety}
          />
          <p className="text-center text-olive/80">
            Mostrá este QR al pagar: el local te suma el sello.
          </p>
          {doubleInfo && (
            <p className="rounded-2xl bg-cream-card p-4 text-center text-sm text-olive">
              {doubleNow ? <strong>¡Ahora hay sello doble! </strong> : null}
              {doubleInfo}
            </p>
          )}
          {data.program.referralEnabled && (
            <InviteShare
              url={inviteUrlFor(data.program._id.toString(), card._id.toString())}
              placeName={data.placeName}
            />
          )}
          {!session?.user && (
            <Link
              href={`/login?callbackUrl=${encodeURIComponent(`/local/sellar/${card.serialNumber}`)}`}
              className="text-center text-sm font-semibold text-terracotta-strong underline"
            >
              ¿Sos del local? Iniciá sesión
            </Link>
          )}
        </>
      )}
    </main>
  )
}
