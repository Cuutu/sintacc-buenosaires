import Link from "next/link"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface ExploreChipProps {
  href: string
  children: ReactNode
  icon?: ReactNode
  align?: "start" | "center"
}

export function ExploreChip({ href, children, icon, align = "center" }: ExploreChipProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex h-full min-h-[44px] w-full min-w-0 items-center gap-2 rounded-[16px] border border-olive/15 bg-white px-4 py-3 text-sm font-medium text-[#2D4A34] touch-manipulation",
        "transition-[color,background-color,border-color,box-shadow,transform] duration-200 ease-out",
        "hover:-translate-y-0.5 hover:border-terracotta/45 hover:shadow-[0_8px_20px_-12px_rgba(45,74,52,0.28)]",
        "active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/50 focus-visible:ring-offset-2 focus-visible:ring-offset-cream",
        "motion-reduce:transform-none motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100",
        align === "start" ? "justify-start text-left" : "justify-center text-center"
      )}
    >
      {icon ? (
        <span className="shrink-0 text-olive" aria-hidden>
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 text-balance leading-snug">{children}</span>
    </Link>
  )
}
