import { cn } from "@/lib/utils"

function WheatGrain({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 12 16"
      className={cn("brand-grain", className)}
      fill="currentColor"
      aria-hidden
    >
      <ellipse cx="6" cy="8" rx="4.4" ry="7.2" />
    </svg>
  )
}

export function BrandMark({
  className,
  inverse = false,
  title = "CeliMap",
}: {
  className?: string
  inverse?: boolean
  title?: string
}) {
  const pin = inverse ? "#F7F3EB" : "#2D4A34"
  const wheat = inverse ? "#2D4A34" : "#F7F3EB"
  const grain = "#D4633A"
  const slash = inverse ? "#2D4A34" : "#F7F3EB"

  return (
    <svg
      viewBox="0 0 64 80"
      className={className}
      role={title ? "img" : "presentation"}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
    >
      <path
        d="M32 2c16.6 0 30 13.2 30 30.2C62 50.8 32 78 32 78S2 50.8 2 32.2C2 15.2 15.4 2 32 2Z"
        fill={pin}
      />
      <g transform="translate(18 18)">
        <path
          d="M8.2 34.5c6.4-7.2 12.2-16.4 14.8-24.6"
          stroke={slash}
          strokeWidth="2.4"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M14 36.5c.4-8.8 2.2-16.4 6.6-24.8"
          stroke={wheat}
          strokeWidth="2.1"
          strokeLinecap="round"
          fill="none"
        />
        <ellipse cx="22.4" cy="8.2" rx="2.5" ry="4.1" fill={grain} transform="rotate(-28 22.4 8.2)" />
        <ellipse cx="18.2" cy="11.4" rx="2.2" ry="3.6" fill={wheat} transform="rotate(-22 18.2 11.4)" />
        <ellipse cx="24.6" cy="13.1" rx="2.1" ry="3.4" fill={wheat} transform="rotate(-32 24.6 13.1)" />
        <ellipse cx="16.4" cy="16.6" rx="2" ry="3.3" fill={wheat} transform="rotate(-18 16.4 16.6)" />
        <ellipse cx="22.8" cy="17.8" rx="2" ry="3.2" fill={wheat} transform="rotate(-28 22.8 17.8)" />
        <ellipse cx="15.2" cy="22" rx="1.9" ry="3.1" fill={wheat} transform="rotate(-14 15.2 22)" />
        <ellipse cx="21.2" cy="22.6" rx="1.9" ry="3" fill={wheat} transform="rotate(-24 21.2 22.6)" />
      </g>
    </svg>
  )
}

export function BrandWordmark({
  className,
  inverse = false,
  showTagline = false,
}: {
  className?: string
  inverse?: boolean
  showTagline?: boolean
}) {
  return (
    <span className={cn("inline-flex flex-col", className)}>
      <span
        className={cn(
          "font-display text-[1.35em] font-bold leading-none tracking-tight",
          inverse ? "text-cream" : "text-olive"
        )}
      >
        Cel
        <span className="brand-i-grain">
          ı
          <WheatGrain />
        </span>
        Map
      </span>
      {showTagline ? (
        <span
          className={cn(
            "mt-1 font-serif text-[0.62em] italic leading-none",
            inverse ? "text-cream/85" : "text-terracotta"
          )}
        >
          tu mapa sin gluten
        </span>
      ) : null}
    </span>
  )
}

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
  showTagline?: boolean
  size?: "sm" | "md" | "lg"
}) {
  const markSize = {
    sm: "h-8 w-auto",
    md: "h-9 w-auto md:h-10",
    lg: "h-12 w-auto md:h-14",
  }[size]
  const typeSize = {
    sm: "text-[1.05rem]",
    md: "text-[1.2rem] md:text-[1.35rem]",
    lg: "text-[1.65rem] md:text-[1.9rem]",
  }[size]

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandMark
        className={cn(markSize, "shrink-0", !markOnly && "pointer-events-none")}
        inverse={inverse}
        title={markOnly ? "CeliMap" : ""}
      />
      {markOnly ? null : (
        <BrandWordmark
          inverse={inverse}
          showTagline={showTagline}
          className={typeSize}
        />
      )}
    </span>
  )
}
