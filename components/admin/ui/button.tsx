import { forwardRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ReactNode } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"

/**
 * Botones del admin. Cuatro variantes, siempre 44 px de alto (también los links,
 * que antes medían 36 px al lado de un botón de 44):
 * - primary: la acción principal de la pantalla o de la fila (una sola).
 * - secondary: acciones comunes.
 * - quiet: acciones de poco peso, sin borde.
 * - danger: borrar, ocultar, despublicar.
 */
export type AdminButtonVariant = "primary" | "secondary" | "quiet" | "danger"
export type AdminButtonSize = "md" | "icon"

const BASE =
  "inline-flex h-11 min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive/40 focus-visible:ring-offset-2 focus-visible:ring-offset-cream disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50"

const VARIANTS: Record<AdminButtonVariant, string> = {
  primary: "bg-terracotta-strong text-white hover:bg-terracotta-hover",
  secondary: "border border-line bg-cream-card text-olive hover:bg-cream",
  quiet: "text-olive hover:bg-olive/8",
  danger: "border border-line bg-cream-card text-danger hover:bg-danger-soft",
}

const SIZES: Record<AdminButtonSize, string> = {
  md: "px-4",
  icon: "w-11 min-w-11 px-0",
}

export function adminButtonClass({
  variant = "secondary",
  size = "md",
  className,
}: { variant?: AdminButtonVariant; size?: AdminButtonSize; className?: string } = {}) {
  return cn(BASE, VARIANTS[variant], SIZES[size], className)
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: AdminButtonVariant
  size?: AdminButtonSize
}

export const AdminButton = forwardRef<HTMLButtonElement, ButtonProps>(function AdminButton(
  { variant, size, className, type = "button", ...props },
  ref
) {
  return <button ref={ref} type={type} className={adminButtonClass({ variant, size, className })} {...props} />
})

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string
  variant?: AdminButtonVariant
  size?: AdminButtonSize
  /** Abre en otra pestaña (fichas públicas, Instagram…). */
  external?: boolean
  children: ReactNode
}

export function AdminLinkButton({ href, variant, size, className, external, children, ...props }: LinkProps) {
  const cls = adminButtonClass({ variant, size, className })
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls} {...props}>
        {children}
      </a>
    )
  }
  return (
    <Link href={href} className={cls} {...props}>
      {children}
    </Link>
  )
}
