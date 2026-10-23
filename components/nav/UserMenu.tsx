"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { signOut } from "next-auth/react"
import { ChevronDown, Heart, List, LogOut, Shield, UserRound } from "lucide-react"
import { cn } from "@/lib/utils"
import { avatarAtSize, isAllowedAvatarUrl } from "@/lib/avatar-url"

type UserMenuProps = {
  name?: string | null
  /** Foto de la cuenta (la de Google). Sin foto, o si no carga, va la inicial. */
  image?: string | null
  isAdmin: boolean
  showFavorites: boolean
  compact?: boolean
}

const itemClass =
  "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[#2D4A34] hover:bg-[#2D4A34]/5 focus-visible:bg-[#2D4A34]/5 focus-visible:outline-none"

/**
 * Menú de la cuenta en la barra de compu (revisión 20/10): antes el corazón y
 * "salir" eran íconos sueltos. Liviano a propósito (sin Radix): la barra está en
 * todas las páginas y suma al JS de cada una.
 */
export function UserMenu({ name, image, isAdmin, showFavorites, compact }: UserMenuProps) {
  const [open, setOpen] = useState(false)
  const [photoFailed, setPhotoFailed] = useState(false)
  // Otra cuenta, otra foto: vuelve a probar.
  useEffect(() => setPhotoFailed(false), [image])
  const photo = !photoFailed && isAllowedAvatarUrl(image) ? avatarAtSize(image!.trim(), 64) : null
  const rootRef = useRef<HTMLDivElement>(null)
  const firstName = name?.trim().split(/\s+/)[0] || "Mi cuenta"
  const initial = firstName.charAt(0).toUpperCase()

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("pointerdown", onPointer)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("pointerdown", onPointer)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  const close = () => setOpen(false)

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "flex items-center gap-2 rounded-full pl-1 pr-2.5 text-sm font-bold text-olive transition-colors hover:bg-olive/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive/30",
          compact ? "h-9" : "h-10"
        )}
      >
        {photo ? (
          // <img> y no next/image: la barra está en todas las páginas y next/image suma JS.
          // Google ya la sirve achicada (avatarAtSize); no-referrer porque a veces
          // responde 403 si le llega el referer.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt=""
            width={32}
            height={32}
            referrerPolicy="no-referrer"
            decoding="async"
            onError={() => setPhotoFailed(true)}
            className="h-8 w-8 shrink-0 rounded-full bg-[#2D4A34]/10 object-cover"
            data-testid="user-menu-photo"
          />
        ) : (
          <span
            aria-hidden
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2D4A34] text-sm font-extrabold text-[#F7F3EB]"
          >
            {initial}
          </span>
        )}
        <span className="hidden max-w-[120px] truncate lg:inline">{firstName}</span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Tu cuenta"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 rounded-2xl border border-olive/10 bg-[#FDFBF7] p-1.5 shadow-[0_18px_40px_-18px_rgba(31,42,34,0.45)]"
        >
          <Link href="/perfil" role="menuitem" className={itemClass} onClick={close}>
            <UserRound className="h-4 w-4" aria-hidden />
            Mi perfil
          </Link>
          {showFavorites ? (
            <Link href="/favoritos" role="menuitem" className={itemClass} onClick={close}>
              <Heart className="h-4 w-4" aria-hidden />
              Favoritos
            </Link>
          ) : null}
          <Link href="/listas" role="menuitem" className={itemClass} onClick={close}>
            <List className="h-4 w-4" aria-hidden />
            Listas
          </Link>
          {isAdmin ? (
            <Link href="/admin" role="menuitem" className={itemClass} onClick={close}>
              <Shield className="h-4 w-4" aria-hidden />
              Panel de administración
            </Link>
          ) : null}
          <div className="my-1 h-px bg-olive/10" aria-hidden />
          <button
            type="button"
            role="menuitem"
            className={itemClass}
            onClick={() => {
              close()
              void signOut()
            }}
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Cerrar sesión
          </button>
        </div>
      ) : null}
    </div>
  )
}
