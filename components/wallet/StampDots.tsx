import Image from "next/image"
import { Gift } from "lucide-react"
import { cn } from "@/lib/utils"
import { stampGrid, stampTilt } from "@/lib/wallet/stamp-style"
import {
  CARD_SAFETY_LABEL,
  cardSafetyPill,
  cardTheme,
  type CardSafety,
} from "@/lib/wallet/card-safety"

const NUMBER_SIZE = (cols: number) => (cols <= 5 ? "text-lg" : cols <= 7 ? "text-sm" : "text-[10px]")

/** Sellos con la espiga de CeliMap, igual que la franja de la tarjeta del Wallet. */
export function StampGrid({
  stamps,
  total,
  safety = null,
  className,
}: {
  stamps: number
  total: number
  safety?: CardSafety | null
  className?: string
}) {
  const { cols } = stampGrid(total)
  const theme = cardTheme(safety)
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
              className="flex aspect-square items-center justify-center rounded-full border-[3px] bg-[#F7F3EB] shadow-[0_2px_6px_rgba(0,0,0,0.25)]"
              style={{
                transform: `rotate(${stampTilt(i)}deg)`,
                borderColor: isReward ? theme.rewardBorder : "#F7F3EB",
              }}
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
              !isReward && "border-[#F7F3EB]/45 text-[#F7F3EB]/50",
              NUMBER_SIZE(cols)
            )}
            style={
              isReward
                ? { borderColor: theme.accent, backgroundColor: theme.rewardFill }
                : { backgroundColor: theme.emptyFill }
            }
          >
            {isReward ? <Gift className="h-[46%] w-[46%]" style={{ color: theme.accent }} aria-hidden /> : i + 1}
          </span>
        )
      })}
    </div>
  )
}

/** Etiqueta "100% sin TACC" / "Con opciones sin TACC", como en la franja del Wallet. */
export function SafetyPill({ safety, className }: { safety: CardSafety; className?: string }) {
  const pill = cardSafetyPill(safety)
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em]",
        className
      )}
      style={{ backgroundColor: pill.background, color: pill.text }}
    >
      <Image
        src={pill.pin === "mark" ? "/wallet/apple/stamp-mark.png" : "/wallet/apple/stamp-reward.png"}
        alt=""
        width={179}
        height={240}
        className="h-3 w-auto"
      />
      {CARD_SAFETY_LABEL[safety]}
    </span>
  )
}

/** Tarjeta como se ve en el Wallet. */
export function LoyaltyCardPreview({
  placeName,
  reward,
  stamps,
  total,
  safety = null,
}: {
  placeName: string
  reward: string
  stamps: number
  total: number
  safety?: CardSafety | null
}) {
  const theme = cardTheme(safety)
  return (
    <div
      className="overflow-hidden rounded-2xl text-[#F7F3EB] shadow-lg"
      style={{ backgroundColor: theme.background }}
    >
      <div className="flex items-center justify-between px-4 pb-3 pt-4">
        <span className="flex items-center gap-2 text-lg font-bold">
          <Image src="/wallet/apple/logo@3x.png" alt="" width={110} height={150} className="h-8 w-auto" />
          CeliMap
        </span>
        <span className="text-right text-[10px] font-semibold uppercase tracking-wide" style={{ color: theme.label }}>
          Sellos
          <span className="block text-lg font-medium normal-case tracking-normal text-[#F7F3EB]">
            {stamps}/{total}
          </span>
        </span>
      </div>
      <div
        className="flex flex-col items-center gap-3 px-5 py-4"
        style={{ backgroundImage: `linear-gradient(180deg, ${theme.background}, ${theme.backgroundEnd})` }}
      >
        {safety && <SafetyPill safety={safety} />}
        <StampGrid stamps={stamps} total={total} safety={safety} className="w-full" />
      </div>
      <div className="flex items-start justify-between gap-4 px-4 pb-4 pt-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: theme.label }}>
            Local
          </p>
          <p className="truncate text-base">{placeName}</p>
        </div>
        <div className="min-w-0 text-right">
          <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: theme.label }}>
            Premio
          </p>
          <p className="text-base">{reward}</p>
        </div>
      </div>
    </div>
  )
}
