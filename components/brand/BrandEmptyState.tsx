import type { ReactNode } from "react"
import { Wheat } from "lucide-react"
import { cn } from "@/lib/utils"

export function BrandEmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[24px] border border-olive/10 bg-card px-8 py-16 text-center shadow-soft",
        className
      )}
    >
      <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-olive/8 text-olive">
        <Wheat className="h-6 w-6" strokeWidth={1.7} aria-hidden />
      </span>
      <h2 className="font-display text-lg font-bold text-olive">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  )
}
