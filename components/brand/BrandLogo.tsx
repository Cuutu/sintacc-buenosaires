import { cn } from "@/lib/utils"

/** Cache-bust: Next/browser cacheaban PNG viejo con fondo cream. */
const CACHE = "v2"

const LOCKUP = {
  src: `/brand/logo-principal.png?${CACHE}`,
  width: 1200,
  height: 366,
} as const

const LOCKUP_INVERSE = {
  src: `/brand/logo-principal-neg.png?${CACHE}`,
  width: 1200,
  height: 370,
} as const

const MARK = {
  src: `/brand/mark.png?${CACHE}`,
  width: 512,
  height: 684,
} as const

const HEIGHT = {
  xs: "h-8 md:h-9",
  sm: "h-11 md:h-12",
  md: "h-11 md:h-12",
  lg: "h-12 md:h-[4.5rem]",
} as const

export function BrandLogo({
  className,
  inverse = false,
  markOnly = false,
  showTagline = false,
  size = "md",
}: {
  className?: string
  inverse?: boolean
  markOnly?: boolean
  /** Tagline ya viene en el lockup oficial. Se conserva por API. */
  showTagline?: boolean
  size?: "xs" | "sm" | "md" | "lg"
}) {
  void showTagline

  if (markOnly) {
    return (
      <span className={cn("inline-flex items-center bg-transparent", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={MARK.src}
          alt="CeliMap"
          width={MARK.width}
          height={MARK.height}
          className={cn(HEIGHT[size], "w-auto bg-transparent")}
        />
      </span>
    )
  }

  const lockup = inverse ? LOCKUP_INVERSE : LOCKUP

  return (
    <span className={cn("inline-flex items-center bg-transparent", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={lockup.src}
        alt="CeliMap — tu mapa sin gluten"
        width={lockup.width}
        height={lockup.height}
        className={cn(HEIGHT[size], "w-auto max-w-[min(100%,18rem)] bg-transparent object-contain object-left")}
      />
    </span>
  )
}
