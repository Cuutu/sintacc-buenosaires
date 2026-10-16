import Image from "next/image"
import { BADGE_ALT, type WalletBadge } from "@/lib/wallet/badges"
import type { LoyaltyWallet } from "@/models/LoyaltyCard"

/** Alto de la insignia en pantalla: Google pide 48 dp como mínimo; Apple, el mismo alto que el resto. */
export const BADGE_HEIGHT = 48

type Props = {
  wallet: LoyaltyWallet
  href: string
  /** La insignia oficial; sin archivo, botón de texto. */
  badge: WalletBadge | null
}

/**
 * Botón para guardar la tarjeta. Es un <a> y no un <Link>: el prefetch crearía tarjetas.
 * La insignia va tal cual la dan Apple y Google: sin cambiarle colores, bordes ni proporción.
 */
export function AddToWalletButton({ wallet, href, badge }: Props) {
  if (badge) {
    return (
      <a href={href} className="mx-auto inline-flex rounded-lg p-1" aria-label={badge.alt}>
        <Image
          src={badge.src}
          alt={badge.alt}
          width={badge.width}
          height={badge.height}
          unoptimized
          priority
          style={{ height: BADGE_HEIGHT, width: "auto" }}
        />
      </a>
    )
  }
  return (
    <a
      href={href}
      className="flex h-12 items-center justify-center rounded-full bg-black px-6 text-base font-semibold text-white"
    >
      {BADGE_ALT[wallet]}
    </a>
  )
}
