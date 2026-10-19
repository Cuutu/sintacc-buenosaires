import Image from "next/image"
import { Gift, Wheat } from "lucide-react"
import { posterQr, QR_QUIET_ZONE } from "@/lib/wallet/poster-qr"
import { stampTilt } from "@/lib/wallet/stamp-style"
import { CARD_SAFETY_LABEL, type CardSafety } from "@/lib/wallet/card-safety"
import { BADGE_TRADEMARK, type WalletBadge } from "@/lib/wallet/badges"

/**
 * Cartel para la caja del local: el QR lleva a la página de la tarjeta (/tarjeta/<programa>).
 * Se diseña en milímetros de una hoja A5 (148 × 210) con la variable --u, que la página
 * cambia según el tamaño elegido y la pantalla.
 */

const u = (n: number) => `calc(var(--u) * ${n})`

const OLIVE = "#2D4A34"

type Props = {
  placeName: string
  reward: string
  stampsForReward: number
  enrollUrl: string
  wallets: { apple: boolean; google: boolean }
  /** Como en el mapa: verde si es 100% sin TACC, terracota si tiene opciones. */
  safety: CardSafety | null
  /** Insignias oficiales de los Wallets (null si falta el archivo: queda la línea de texto). */
  badges?: { apple: WalletBadge | null; google: WalletBadge | null }
}

function titleSize(name: string): number {
  if (name.length <= 14) return 13
  if (name.length <= 22) return 11
  if (name.length <= 32) return 9
  return 7.5
}

function walletsLine({ apple, google }: Props["wallets"]): string {
  if (apple && google) return "Funciona con Apple Wallet y Google Wallet."
  if (google) return "Funciona con Google Wallet."
  return "Funciona con Apple Wallet."
}

function PosterQrCode({ value }: { value: string }) {
  const qr = posterQr(value)
  const box = qr.size + QR_QUIET_ZONE * 2
  return (
    <svg
      viewBox={`${-QR_QUIET_ZONE} ${-QR_QUIET_ZONE} ${box} ${box}`}
      style={{ width: u(64), height: u(64), minHeight: 0, flex: "0 1 auto", display: "block" }}
      role="img"
      aria-label="Código QR de la tarjeta de sellos"
    >
      <rect x={-QR_QUIET_ZONE} y={-QR_QUIET_ZONE} width={box} height={box} fill="#fff" />
      <path d={qr.dataPath} fill={OLIVE} shapeRendering="crispEdges" />
      {qr.eyes.map((eye, i) => (
        <g key={i} fill={OLIVE}>
          <path d={eye.ring} fillRule="evenodd" />
          <path d={eye.dot} />
        </g>
      ))}
      {qr.logo && (
        <image
          href="/brand/mark.png"
          x={qr.logo.x + qr.logo.size * 0.17}
          y={qr.logo.y + qr.logo.size * 0.06}
          width={qr.logo.size * 0.66}
          height={qr.logo.size * 0.88}
        />
      )}
    </svg>
  )
}

const CREAM = "#F7F3EB"
const TERRACOTTA = "#D4633A"

/**
 * Muestra de cómo se llena la tarjeta: hasta 5 lugares y, si son más sellos, "…" antes del premio.
 * Todo en vector (espiga y regalo) y con bordes lisos: el PNG del sello y los bordes punteados
 * quedaban mal en el PDF.
 */
function StampRow({ total }: { total: number }) {
  const slot = { width: u(11), height: u(11) }
  const shown = Math.min(total, 5)
  const filled = Math.min(3, Math.max(0, shown - 2))
  const empty = Array.from({ length: Math.max(0, shown - 1 - filled) }, (_, i) => filled + i + 1)
  return (
    <div className="flex items-center" style={{ gap: u(2.6) }} aria-hidden>
      {Array.from({ length: filled }, (_, i) => (
        <span
          key={`sello-${i}`}
          className="flex items-center justify-center rounded-full"
          style={{ ...slot, background: CREAM, transform: `rotate(${stampTilt(i)}deg)` }}
        >
          <Wheat style={{ width: u(6.4), height: u(6.4), color: OLIVE }} strokeWidth={2} />
        </span>
      ))}
      {empty.map((n) => (
        <span
          key={`vacio-${n}`}
          className="flex items-center justify-center rounded-full font-bold leading-none"
          style={{
            ...slot,
            border: `${u(0.45)} solid rgba(247, 243, 235, 0.45)`,
            color: "rgba(247, 243, 235, 0.7)",
            fontSize: u(4.2),
          }}
        >
          {n}
        </span>
      ))}
      {total > shown && (
        <svg viewBox="0 0 26 6" style={{ width: u(6.4), height: u(1.5), display: "block" }}>
          {[3, 13, 23].map((cx) => (
            <circle key={cx} cx={cx} cy={3} r={2.6} fill="rgba(247, 243, 235, 0.6)" />
          ))}
        </svg>
      )}
      <span className="flex items-center justify-center rounded-full" style={{ ...slot, background: TERRACOTTA }}>
        <Gift style={{ width: u(5.4), height: u(5.4), color: CREAM }} strokeWidth={2.2} />
      </span>
    </div>
  )
}

/** Las insignias tal cual las dan Apple y Google, del mismo alto y sin tocarlas. */
function BadgeRow({ badges }: { badges: WalletBadge[] }) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-center" style={{ gap: u(4), marginTop: u(5) }}>
      {badges.map((badge) => (
        <Image
          key={badge.src}
          src={badge.src}
          alt={badge.alt}
          width={badge.width}
          height={badge.height}
          unoptimized
          priority
          style={{ height: u(9), width: "auto" }}
        />
      ))}
    </div>
  )
}

export function LoyaltyPoster({ placeName, reward, stampsForReward, enrollUrl, wallets, safety, badges }: Props) {
  const shownBadges = [wallets.apple ? badges?.apple : null, wallets.google ? badges?.google : null].filter(
    (b): b is WalletBadge => Boolean(b)
  )
  const trademarks = [
    wallets.apple && badges?.apple ? BADGE_TRADEMARK.apple : null,
    wallets.google && badges?.google ? BADGE_TRADEMARK.google : null,
  ].filter(Boolean)
  const steps = ["Escaneá el QR con la cámara", "Guardá la tarjeta en tu Wallet", "Mostrala al pagar y sumá sellos"]
  const offer = `Juntá ${stampsForReward} sellos y te llevás ${reward}.`
  return (
    <div
      data-cartel
      className="relative flex flex-col overflow-hidden bg-[#F7F3EB] text-[#2D4A34] shadow-2xl"
      style={{ width: u(148), height: u(210) }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{ backgroundImage: "url(/brand/texture-wheat-watermark.svg)", backgroundSize: u(80) }}
      />

      {/* Si el nombre o el premio son largos, el QR se achica para que todo entre en la hoja. */}
      <div
        className="relative flex min-h-0 flex-1 flex-col items-center text-center"
        style={{ padding: `${u(10)} ${u(12)} 0` }}
      >
        <Image
          src="/brand/logo-principal.png"
          alt="CeliMap"
          width={1200}
          height={366}
          priority
          className="shrink-0"
          style={{ height: u(10), width: "auto" }}
        />
        <p className="shrink-0 font-serif italic text-[#D4633A]" style={{ fontSize: u(6.4), marginTop: u(5) }}>
          Tarjeta de sellos
        </p>
        <h2
          className="shrink-0 font-extrabold leading-[1.05]"
          style={{ fontSize: u(titleSize(placeName)), marginTop: u(1.5), overflowWrap: "anywhere" }}
        >
          {placeName}
        </h2>
        {safety && (
          <span
            className={`inline-flex shrink-0 items-center rounded-full font-bold text-[#F7F3EB] ${
              safety === "dedicated" ? "bg-[#2D4A34]" : "bg-[#B84420]"
            }`}
            style={{ marginTop: u(2.6), padding: `${u(1.2)} ${u(3.4)}`, gap: u(1.6), fontSize: u(3.6) }}
          >
            <Image
              src="/wallet/apple/logo@3x.png"
              alt=""
              width={110}
              height={150}
              priority
              style={{ height: u(4.2), width: "auto" }}
            />
            {CARD_SAFETY_LABEL[safety]}
          </span>
        )}
        <p className="shrink-0" style={{ fontSize: u(offer.length > 50 ? 4 : 4.6), marginTop: u(3), lineHeight: 1.3 }}>
          Juntá {stampsForReward} sellos y te llevás{" "}
          <strong className="text-[#B84420]">{reward}</strong>.
        </p>

        <div
          className="flex min-h-0 flex-col items-center rounded-[6%] border border-[#E8E1D6] bg-white shadow-[0_2px_10px_rgba(45,74,52,0.12)]"
          style={{ marginTop: u(5), padding: `${u(3)} ${u(3)} ${u(2.6)}` }}
        >
          <PosterQrCode value={enrollUrl} />
          <p className="shrink-0 font-bold" style={{ fontSize: u(4), marginTop: u(1) }}>
            Apuntá la cámara del celu acá
          </p>
        </div>

        <ol className="grid w-full shrink-0 grid-cols-3" style={{ gap: u(4), marginTop: u(5) }}>
          {steps.map((step, i) => (
            <li key={step} className="flex flex-col items-center">
              <span
                className="flex items-center justify-center rounded-full bg-[#B84420] font-bold text-white"
                style={{ width: u(6.4), height: u(6.4), fontSize: u(3.6) }}
              >
                {i + 1}
              </span>
              <span className="font-semibold leading-tight" style={{ fontSize: u(3.5), marginTop: u(1.6) }}>
                {step}
              </span>
            </li>
          ))}
        </ol>

        {shownBadges.length > 0 && <BadgeRow badges={shownBadges} />}
      </div>

      <div
        className="relative flex shrink-0 flex-col items-center bg-[#2D4A34] text-center text-[#F7F3EB]"
        style={{ marginTop: u(5), padding: `${u(6)} ${u(12)} ${u(8)}` }}
      >
        <StampRow total={stampsForReward} />
        {shownBadges.length === 0 && (
          <p className="font-semibold" style={{ fontSize: u(3.6), marginTop: u(4) }}>
            {walletsLine(wallets)}
          </p>
        )}
        <p
          className="text-[#F7F3EB]/75"
          style={{ fontSize: u(3.3), marginTop: shownBadges.length === 0 ? u(0.6) : u(4) }}
        >
          Sin descargar nada y sin crear cuenta ·{" "}
          <span className="font-serif italic text-[#D6CDBA]">celimap.com.ar</span>
        </p>
        {trademarks.length > 0 && (
          <p className="text-[#F7F3EB]/50" style={{ fontSize: u(2.2), marginTop: u(2), lineHeight: 1.3 }}>
            {trademarks.join(" ")}
          </p>
        )}
      </div>
    </div>
  )
}
