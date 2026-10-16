"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { BADGE_ALT } from "@/lib/wallet/badge-text"
import type { WalletBadge } from "@/lib/wallet/badges"
import type { LoyaltyWallet } from "@/models/LoyaltyCard"

/** Alto de la insignia en pantalla: Google pide 48 dp como mínimo; Apple, el mismo alto que el resto. */
export const BADGE_HEIGHT = 48

/** Después de tocar, el botón espera esto antes de aceptar otro toque. */
const PENDING_MS = 8000

type Props = {
  wallet: LoyaltyWallet
  href: string
  /** La insignia oficial; sin archivo, botón de texto. */
  badge: WalletBadge | null
}

/**
 * Botón para guardar la tarjeta. Es un <a> y no un <Link>: el prefetch crearía tarjetas.
 * Un segundo toque mientras abre el Wallet no hace nada (si no, se creaban dos tarjetas).
 * La insignia va tal cual la dan Apple y Google: sin cambiarle colores, bordes ni proporción.
 */
export function AddToWalletButton({ wallet, href, badge }: Props) {
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!pending) return
    const timer = setTimeout(() => setPending(false), PENDING_MS)
    return () => clearTimeout(timer)
  }, [pending])

  function onClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (pending) {
      event.preventDefault()
      return
    }
    setPending(true)
  }

  const label = BADGE_ALT[wallet]
  return (
    <div className="flex flex-col items-center gap-1">
      {badge ? (
        <a
          href={href}
          onClick={onClick}
          aria-busy={pending}
          aria-label={label}
          className={cn("mx-auto inline-flex rounded-lg p-1 transition-opacity", pending && "opacity-60")}
        >
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
      ) : (
        <a
          href={href}
          onClick={onClick}
          aria-busy={pending}
          className={cn(
            "flex h-12 w-full items-center justify-center rounded-full bg-black px-6 text-base font-semibold text-white transition-opacity",
            pending && "opacity-60"
          )}
        >
          {label}
        </a>
      )}
      {pending && (
        <p role="status" className="text-xs text-olive/70">
          Abriendo {wallet === "apple" ? "Apple Wallet" : "Google Wallet"}…
        </p>
      )}
    </div>
  )
}
