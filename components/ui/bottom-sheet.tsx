"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

type SheetHeight = "collapsed" | "half" | "full"

interface BottomSheetProps {
  children: React.ReactNode
  className?: string
  collapsedHeight?: number
  halfHeight?: number
}

export function BottomSheet({
  children,
  className,
  collapsedHeight = 140,
  halfHeight = 50,
}: BottomSheetProps) {
  const [height, setHeight] = React.useState<SheetHeight>("half")
  const heightRef = React.useRef(height)
  heightRef.current = height

  const cycleHeight = () => {
    setHeight((h) =>
      h === "collapsed" ? "half" : h === "half" ? "full" : "collapsed"
    )
  }

  const heightStyle =
    height === "collapsed"
      ? { height: `${collapsedHeight}px` }
      : height === "half"
        ? { height: `${halfHeight}vh` }
        : { height: "90vh" }

  return (
    <div
      className={cn(
        "absolute bottom-0 left-0 right-0 z-20 rounded-t-2xl bg-background/95 backdrop-blur-xl border-t border-border/50",
        "transition-[height] duration-300 ease-out",
        className
      )}
      style={heightStyle}
    >
      {/* Handle - draggable area */}
      <button
        type="button"
        className="flex justify-center w-full py-4 cursor-grab active:cursor-grabbing touch-none min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50"
        onClick={cycleHeight}
        aria-label="Cambiar altura del panel"
      >
        <div className="w-12 h-1.5 rounded-full bg-white/30" aria-hidden />
      </button>

      <div className="overflow-y-auto overscroll-contain h-[calc(100%-3rem)] pb-[env(safe-area-inset-bottom)]">
        {children}
      </div>
    </div>
  )
}
