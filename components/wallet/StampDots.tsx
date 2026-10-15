import { cn } from "@/lib/utils"

/** Fila de sellos, igual que en la tarjeta del Wallet. */
export function StampDots({
  stamps,
  total,
  className,
}: {
  stamps: number
  total: number
  className?: string
}) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)} aria-label={`${stamps} de ${total} sellos`}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-9 w-9 rounded-full border-[3px] border-[#F7F3EB]",
            i < stamps && "bg-[#F7F3EB]"
          )}
        />
      ))}
    </div>
  )
}

/** Tarjeta verde oliva como se ve en el Wallet. */
export function LoyaltyCardPreview({
  placeName,
  reward,
  stamps,
  total,
}: {
  placeName: string
  reward: string
  stamps: number
  total: number
}) {
  return (
    <div className="rounded-2xl bg-[#2D4A34] p-5 text-[#F7F3EB] shadow-lg">
      <div className="flex items-start justify-between">
        <span className="text-lg font-bold">CeliMap</span>
        <span className="text-right text-xs uppercase tracking-wide text-[#D6CDBA]">
          Sellos
          <span className="block text-lg normal-case text-[#F7F3EB]">
            {stamps}/{total}
          </span>
        </span>
      </div>
      <StampDots stamps={stamps} total={total} className="mt-4" />
      <p className="mt-2 text-sm">{placeName}</p>
      <p className="mt-4 text-xs uppercase tracking-wide text-[#D6CDBA]">Premio</p>
      <p className="text-base">{reward}</p>
    </div>
  )
}
