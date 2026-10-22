import { adminButtonClass } from "@/components/admin/ui/button"
import { filterChipClass } from "@/components/admin/ui/filter-chip"

/**
 * Clases visuales del admin, armadas sobre los tokens de color (tailwind.config.ts:
 * olive, cream, line, ink-muted, terracotta-strong, success, warning, danger).
 * Nada de hex sueltos: para algo nuevo, usá los componentes de components/admin/ui.
 */
export const adminUi = {
  bg: "bg-cream",
  card: "rounded-[24px] border border-line bg-cream-card shadow-[0_8px_28px_-18px_rgba(45,74,52,0.16)]",
  title: "font-display text-[28px] font-extrabold tracking-[-0.03em] text-olive",
  subtitle: "text-base text-ink-muted",
  label: "text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted",
  text: "text-olive",
  muted: "text-ink-muted",
  border: "border-line",
  input:
    "h-11 w-full rounded-2xl border border-line bg-cream px-3 text-sm text-olive outline-none placeholder:text-ink-muted focus-visible:ring-2 focus-visible:ring-olive/30",
  select: "h-11 rounded-2xl border border-line bg-cream-card px-3 text-sm text-olive",
  btnPrimary: adminButtonClass({ variant: "primary" }),
  btnGhost: adminButtonClass({ variant: "secondary" }),
  btnQuiet: adminButtonClass({ variant: "quiet" }),
  btnDanger: adminButtonClass({ variant: "danger" }),
  chip: filterChipClass(false),
  chipActive: filterChipClass(true),
} as const
