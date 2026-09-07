import Link from "next/link"
import { cn } from "@/lib/utils"

export function SuggestVentureCta({ className }: { className?: string }) {
  return (
    <Link
      href="/sugerir-emprendimiento"
      className={cn(
        "inline-flex h-14 shrink-0 items-center justify-center rounded-2xl bg-[#C85A2E] px-5 text-sm font-bold text-[#F8F5EF] hover:bg-[#B44F27]",
        className
      )}
    >
      Sugerir emprendimiento
    </Link>
  )
}
