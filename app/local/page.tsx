import Link from "next/link"
import { getServerSession } from "next-auth"
import { Printer } from "lucide-react"
import { redirect } from "next/navigation"
import mongoose from "mongoose"
import { authOptions } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import { absoluteUrl } from "@/lib/base-url"
import { LoyaltyProgram } from "@/models/LoyaltyProgram"
import { Place } from "@/models/Place"
import { enrollPathFor, getProgramStats, normalizeEmail } from "@/lib/wallet/loyalty"
import { formatNoticeTime, nextNoticeAt } from "@/lib/wallet/notice"
import { NoticeForm } from "@/components/wallet/NoticeForm"
import { PromosForm } from "@/components/wallet/PromosForm"

export const dynamic = "force-dynamic"

/** Panel del local: sus tarjetas y cómo sumar sellos. Se puede guardar en la pantalla de inicio. */
export default async function LocalPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect("/login?callbackUrl=/local")

  await connectDB()
  const email = normalizeEmail(session.user.email)
  const filter = session.user.role === "admin" ? {} : { staffEmails: email }
  const programs = email || session.user.role === "admin" ? await LoyaltyProgram.find(filter).lean() : []

  const places = await Place.find({ _id: { $in: programs.map((p) => p.placeId) } })
    .select("name")
    .lean<Array<{ _id: mongoose.Types.ObjectId; name: string }>>()
  const placeName = new Map(places.map((p) => [p._id.toString(), p.name]))
  const stats = await Promise.all(programs.map((p) => getProgramStats(p._id)))
  const now = new Date()

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-10">
      <p className="font-serif text-lg italic text-terracotta">Panel del local</p>
      <h1 className="mt-1 text-2xl font-bold text-olive">Tarjeta de sellos</h1>

      {programs.length === 0 ? (
        <p className="mt-6 text-olive/80">
          Tu cuenta ({session.user.email}) no está asociada a ningún local. Escribinos a
          contacto@celimap.com.ar para sumarte.
        </p>
      ) : (
        <>
          <div className="mt-6 rounded-2xl bg-cream-card p-5 text-olive shadow-sm">
            <h2 className="font-bold">Cómo sumar un sello</h2>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
              <li>El cliente abre su tarjeta en el Wallet.</li>
              <li>Escaneás el QR con la cámara de este celular.</li>
              <li>Se abre CeliMap y tocás &quot;Sumar sello&quot;. La tarjeta del cliente se actualiza sola.</li>
            </ol>
          </div>

          <ul className="mt-6 space-y-4">
            {programs.map((program, i) => {
              const s = stats[i]
              const retention = s.cards > 0 ? Math.round((s.cardsWithSecondStamp / s.cards) * 100) : 0
              const name = placeName.get(program.placeId.toString()) ?? "Local"
              const nextNotice = nextNoticeAt(program.notice, now)
              return (
                <li key={program._id.toString()} className="rounded-2xl border border-[#E8E1D6] bg-white p-5">
                  <h2 className="text-lg font-bold text-olive">
                    {name}
                  </h2>
                  <p className="text-sm text-olive/80">
                    {program.stampsForReward} sellos: {program.reward}
                    {program.active ? "" : " · pausado"}
                  </p>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-olive">
                    <Stat label="Sellos esta semana" value={s.stampsLast7Days} />
                    <Stat label="Tarjetas" value={s.cards} />
                    <Stat label="Volvieron (2+ sellos)" value={`${retention}%`} />
                    <Stat label="Premios canjeados" value={s.redeems} />
                  </dl>
                  <NoticeForm
                    programId={program._id.toString()}
                    placeName={name}
                    cards={s.cards}
                    active={program.active}
                    lastNotice={
                      program.notice
                        ? { text: program.notice.text, sentAt: formatNoticeTime(new Date(program.notice.sentAt)) }
                        : null
                    }
                    nextAt={nextNotice ? formatNoticeTime(nextNotice) : null}
                  />
                  <PromosForm
                    programId={program._id.toString()}
                    initialDoubleStamp={
                      program.doubleStamp
                        ? {
                            days: [...program.doubleStamp.days],
                            fromHour: program.doubleStamp.fromHour,
                            toHour: program.doubleStamp.toHour,
                          }
                        : null
                    }
                  />
                  <Link
                    href={`/local/cartel/${program._id.toString()}`}
                    className="mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-olive px-5 font-semibold text-cream"
                  >
                    <Printer className="h-4 w-4" aria-hidden />
                    Imprimir cartel con QR
                  </Link>
                  <p className="mt-3 break-all text-xs text-olive/70">
                    Link de la tarjeta: {absoluteUrl(enrollPathFor(program._id.toString()))}
                  </p>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </main>
  )
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-[#F8F5EF] p-3">
      <dt className="text-xs text-olive/70">{label}</dt>
      <dd className="text-2xl font-bold">{value}</dd>
    </div>
  )
}
