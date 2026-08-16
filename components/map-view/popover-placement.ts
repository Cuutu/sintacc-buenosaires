export type PopoverSide = "top" | "bottom" | "left" | "right"

export type PopoverPlacement = {
  left: number
  top: number
  side: PopoverSide
  arrowX: number
  arrowY: number
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min
  return Math.min(Math.max(value, min), max)
}

/** Posiciona popover junto al pin, dentro del mapa, sin tapar bordes. */
export function computePopoverPlacement(opts: {
  anchorX: number
  anchorY: number
  cardW: number
  cardH: number
  containerW: number
  containerH: number
  gap?: number
  pad?: number
  pinBody?: number
}): PopoverPlacement {
  const gap = opts.gap ?? 12
  const pad = opts.pad ?? 16
  const pinBody = opts.pinBody ?? 56
  const { anchorX, anchorY, cardW, cardH, containerW, containerH } = opts

  const spaceAbove = anchorY - pinBody - pad
  const spaceRight = containerW - anchorX - pad
  const spaceLeft = anchorX - pad
  const spaceBelow = containerH - anchorY - pad

  let side: PopoverSide = "top"
  if (spaceAbove >= cardH + gap) side = "top"
  else if (spaceRight >= cardW + gap) side = "right"
  else if (spaceLeft >= cardW + gap) side = "left"
  else if (spaceBelow >= cardH + gap) side = "bottom"
  else {
    const ranked: Array<[PopoverSide, number]> = [
      ["top", spaceAbove],
      ["right", spaceRight],
      ["left", spaceLeft],
      ["bottom", spaceBelow],
    ]
    ranked.sort((a, b) => b[1] - a[1])
    side = ranked[0][0]
  }

  let left = 0
  let top = 0
  if (side === "top") {
    left = anchorX - cardW / 2
    top = anchorY - pinBody - gap - cardH
  } else if (side === "bottom") {
    left = anchorX - cardW / 2
    top = anchorY + gap
  } else if (side === "right") {
    left = anchorX + gap
    top = anchorY - pinBody / 2 - cardH / 2
  } else {
    left = anchorX - gap - cardW
    top = anchorY - pinBody / 2 - cardH / 2
  }

  left = clamp(left, pad, Math.max(pad, containerW - cardW - pad))
  top = clamp(top, pad, Math.max(pad, containerH - cardH - pad))

  return {
    left,
    top,
    side,
    arrowX: clamp(anchorX - left, 18, Math.max(18, cardW - 18)),
    arrowY: clamp(anchorY - pinBody / 2 - top, 18, Math.max(18, cardH - 18)),
  }
}
