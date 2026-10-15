import Image from "next/image"
import { Gift } from "lucide-react"
import { cn } from "@/lib/utils"
import { stampGrid, stampTilt } from "@/lib/wallet/stamp-style"

const NUMBER_SIZE = (cols: number) => (cols <= 5 ? "text-lg" : cols <= 7 ? "text-sm" : "text-[10px]")

/** Sellos con la espiga de CeliMap, igual que la franja de la tarjeta del Wallet. */
export function StampGrid({
  stamps,
  total,
  className,
}: {
  stamps: number
  total: number
  className?: string
}) {
  const { cols } = stampGrid(total)
  return (
    <div
      className={cn("mx-auto grid gap-2", className)}
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, maxWidth: cols * 64 }}
      role="img"
      aria-label={`${stamps} de ${total} sellos`}
    >
      {Array.from({ length: total }, (_, i) => {
        const isReward = i === total - 1
        if (i < stamps) {
          return (
            <span
              key={i}
              className={cn(
                "flex aspect-square items-center justify-center rounded-full border-[3px] bg-[#F7F3EB] shadow-[0_2px_6px_rgba(0,0,0,0.25)]",
                isReward ? "border-[#D4633A]" : "border-[#F7F3EB]"
              )}
              style={{ transform: `rotate(${stampTilt(i)}deg)` }}
            >
              <Image
                src={isReward ? "/wallet/apple/stamp-reward.png" : "/wallet/apple/stamp-mark.png"}
                alt=""
                width={179}
                height={240}
                className="h-[62%] w-auto"
              />
            </span>
          )
        }
        return (
          <span
            key={i}
            className={cn(
              "flex aspect-square items-center justify-center rounded-full border-2 border-dashed font-bold",
              isReward
                ? "border-[#D4633A] bg-[#404731]"
                : "border-[#F7F3EB]/45 bg-[#31503A] text-[#F7F3EB]/50",
              NUMBER_SIZE(cols)
            )}
          >
            {isReward ? <Gift className="h-[46%] w-[46%] text-[#D4633A]" aria-hidden /> : i + 1}
          </span>
        )
      })}
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
    <div className="overflow-hidden rounded-2xl bg-[#2D4A34] text-[#F7F3EB] shadow-lg">
      <div className="flex items-center justify-between px-4 pb-3 pt-4">
        <span className="flex items-center gap-2 text-lg font-bold">
          <Image src="/wallet/apple/logo@3x.png" alt="" width={110} height={150} className="h-8 w-auto" />
          CeliMap
        </span>
        <span className="text-right text-[10px] font-semibold uppercase tracking-wide text-[#D6CDBA]">
          Sellos
          <span className="block text-lg font-medium normal-case tracking-normal text-[#F7F3EB]">
            {stamps}/{total}
          </span>
        </span>
      </div>
      <div className="bg-gradient-to-b from-[#2D4A34] to-[#243D2B] px-5 py-4">
        <StampGrid stamps={stamps} total={total} />
      </div>
      <div className="flex items-start justify-between gap-4 px-4 pb-4 pt-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#D6CDBA]">Local</p>
          <p className="truncate text-base">{placeName}</p>
        </div>
        <div className="min-w-0 text-right">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#D6CDBA]">Premio</p>
          <p className="text-base">{reward}</p>
        </div>
      </div>
    </div>
  )
}
