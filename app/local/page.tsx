import Link from "next/link"
import { getServerSession } from "next-auth"
import { ExternalLink, Printer, QrCode, ScanLine } from "lucide-react"
import { redirect } from "next/navigation"
import mongoose from "mongoose"
import { authOptions } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import { absoluteUrl } from "@/lib/base-url"
import { cn } from "@/lib/utils"
import { LoyaltyProgram } from "@/models/LoyaltyProgram"
import { Place } from "@/models/Place"
import { enrollPathFor, getProgramStats, normalizeEmail } from "@/lib/wallet/loyalty"
import { formatNoticeTime, nextNoticeAt } from "@/lib/wallet/notice"
import { getDailyVisits } from "@/lib/wallet/visits"
import { NoticeForm } from "@/components/wallet/NoticeForm"
import { PromosForm } from "@/components/wallet/PromosForm"
import { ShareCardLink } from "@/components/wallet/ShareCardLink"
import { VisitsChart } from "@/components/wallet/VisitsChart"

export const dynamic = "force-dynamic"

/** Panel del local: sus tarjetas, cómo sumar sellos, avisos y promos. Se puede guardar en la pantalla de inicio. */
export default async function LocalPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect("/login?callbackUrl=/local")

  await connectDB()
  const email = normalizeEmail(session.user.email)
  const filter = session.user.role === "admin" ? {} : { staffEmails: email }
  const programs = email || session.user.role === "admin" ? await LoyaltyProgram.find(filter).lean() : []

  const places = await Place.find({ _id: { $in: programs.map((p) => p.placeId) } })
    .select("name slug")
    .lean<Array<{ _id: mongoose.Types.ObjectId; name: string; slug?: string }>>()
  const placeById = new Map(places.map((p) => [p._id.toString(), p]))
  const now = new Date()
  const [stats, visits] = await Promise.all([
    Promise.all(programs.map((p) => getProgramStats(p._id, now))),
    Promise.all(programs.map((p) => getDailyVisits(p._id, now))),
  ])

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-10">
      <p className="font-serif text-lg italic text-terracotta">Panel del local</p>
      <h1 className="mt-1 text-2xl font-bold text-olive">Tarjeta de sellos</h1>

      {programs.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-cream-card p-5 text-olive/80">
          Tu cuenta ({session.user.email}) no está asociada a ningún local. Escribinos a
          contacto@celimap.com.ar para sumarte.
        </p>
      ) : (
        <>
          <section className="mt-6 rounded-2xl bg-olive p-5 text-cream shadow-sm">
            <h2 className="flex items-center gap-2 font-bold">
              <ScanLine className="h-5 w-5" aria-hidden />
              Cómo sumar un sello
            </h2>
            <ol className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
              {[
                "El cliente abre su tarjeta en el Wallet.",
                "Escaneás el QR con la cámara de este celular.",
                "Tocás “Sumar sello” y la tarjeta del cliente se actualiza sola.",
              ].map((step, i) => (
                <li key={step} className="flex gap-2 sm:flex-col">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#B84420] text-sm font-bold text-white">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-cream/70">
              Tip: guardá esta página en la pantalla de inicio del celu de la caja.
            </p>
          </section>

          {programs.length > 1 && (
            <nav className="mt-6 flex flex-wrap gap-2" aria-label="Tus locales">
              {programs.map((program) => (
                <a
                  key={program._id.toString()}
                  href={`#programa-${program._id.toString()}`}
                  className="inline-flex h-11 items-center rounded-full border border-[#E8E1D6] bg-white px-4 text-sm font-semibold text-olive"
                >
                  {placeById.get(program.placeId.toString())?.name ?? "Local"}
                </a>
              ))}
            </nav>
          )}

          <ul className="mt-6 space-y-6">
            {programs.map((program, i) => {
              const s = stats[i]
              const id = program._id.toString()
              const retention = s.cards > 0 ? Math.round((s.cardsWithSecondStamp / s.cards) * 100) : 0
              const place = placeById.get(program.placeId.toString())
              const name = place?.name ?? "Local"
              const nextNotice = nextNoticeAt(program.notice, now)
              return (
                <li
                  key={id}
                  id={`programa-${id}`}
                  className="scroll-mt-24 rounded-3xl border border-[#E8E1D6] bg-white p-5 shadow-sm"
                >
                  <header className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-xl font-bold text-olive">{name}</h2>
                      <p className="mt-0.5 text-sm text-olive/80">
                        {program.stampsForReward} sellos = <strong>{program.reward}</strong>
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-3 py-1 text-xs font-bold",
                        program.active ? "bg-[#E6EDE5] text-olive" : "bg-[#FBE9E2] text-[#B84420]"
                      )}
                    >
                      {program.active ? "Activa" : "Pausada"}
                    </span>
                  </header>

                  <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-olive/60">Cómo viene</h3>
                  <div className="mt-2 grid gap-3">
                    <VisitsChart week={visits[i]} />
                    <dl className="grid grid-cols-2 gap-3 text-olive sm:grid-cols-4">
                      <Stat label="Tarjetas" value={s.cards} />
                      <Stat label="Volvieron" value={`${retention}%`} hint="vinieron 2 días o más" />
                      <Stat label="Premios" value={s.redeems} hint="canjeados" />
                      <Stat
                        label="Invitados"
                        value={s.invitedCards}
                        hint={program.referralEnabled ? "Traé un amigo" : "promo apagada"}
                      />
                    </dl>
                  </div>

                  <NoticeForm
                    programId={id}
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
                    programId={id}
                    initialDoubleStamp={
                      program.doubleStamp
                        ? {
                            days: [...program.doubleStamp.days],
                            fromHour: program.doubleStamp.fromHour,
                            toHour: program.doubleStamp.toHour,
                          }
                        : null
                    }
                    initialReferral={Boolean(program.referralEnabled)}
                  />

                  <section className="mt-5 rounded-2xl bg-[#F8F5EF] p-4 text-olive">
                    <h3 className="flex items-center gap-2 font-bold">
                      <QrCode className="h-4 w-4 text-terracotta-strong" aria-hidden />
                      Que tus clientes la guarden
                    </h3>
                    <p className="mt-1 text-sm text-olive/80">
                      Dejá el cartel con QR en la caja, o pasá el link por WhatsApp o en la bio de Instagram.
                    </p>
                    <Link
                      href={`/local/cartel/${id}`}
                      className="mt-3 inline-flex h-11 items-center gap-2 rounded-full bg-olive px-5 font-semibold text-cream"
                    >
                      <Printer className="h-4 w-4" aria-hidden />
                      Imprimir cartel con QR
                    </Link>
                    <div className="mt-3">
                      <ShareCardLink url={absoluteUrl(enrollPathFor(id))} placeName={name} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold">
                      <a href={enrollPathFor(id)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-terracotta-strong underline">
                        Ver como cliente
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      </a>
                      {place?.slug && (
                        <Link href={`/lugar/${place.slug}`} className="text-terracotta-strong underline">
                          Tu ficha en CeliMap
                        </Link>
                      )}
                    </div>
                  </section>
                </li>
              )
            })}
          </ul>

          <p className="mt-8 text-center text-sm text-olive/70">
            ¿Algo no anda o querés cambiar el premio? Escribinos a contacto@celimap.com.ar.
          </p>
        </>
      )}
    </main>
  )
}

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-xl bg-[#F8F5EF] p-3">
      <dt className="text-xs text-olive/70">{label}</dt>
      <dd className="text-2xl font-bold">{value}</dd>
      {hint && <dd className="text-[11px] text-olive/60">{hint}</dd>}
    </div>
  )
}
