export const PLACE_CREAM = "#F8F5EF"
export const PLACE_OLIVE = "#1F4D35"
export const PLACE_SAGE = "#5F6B63"
export const PLACE_TERRACOTTA = "#C85A2E"
export const PLACE_BORDER = "#E8E1D6"

export const placeCardClass =
  "rounded-[22px] border border-[#E8E1D6] bg-[#FDFBF7]"

export const placeSecondaryBtnClass =
  "inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#1F4D35] bg-transparent text-base font-semibold text-[#1F4D35] transition-colors hover:bg-[#1F4D35]/5 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F4D35]/40"

export const placePrimaryBtnClass =
  "inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#C85A2E] text-base font-bold text-[#F8F5EF] shadow-[0_8px_20px_-10px_rgba(200,90,46,0.55)] transition-colors hover:bg-[#B44F27] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C85A2E]/50"

export function formatNearbyDistance(distance?: number): string | null {
  if (distance == null || !Number.isFinite(distance)) return null
  if (distance < 1000) return `${Math.round(distance)} m`
  return `${(distance / 1000).toFixed(1)} km`
}

export function emptyHeroPinSrc(safetyLevel?: string): string {
  if (safetyLevel === "gf_options") return "/map/pin-options.png"
  if (safetyLevel === "dedicated_gf") return "/map/pin-dedicated.png"
  return "/CelimapLOGO.png"
}

export function heroSafetyCopy(level?: string): { label: string; className: string } {
  if (level === "dedicated_gf") {
    return {
      label: "100% Sin TACC",
      className: "bg-[#1F4D35] text-[#F8F5EF]",
    }
  }
  if (level === "gf_options") {
    return {
      label: "Con opciones",
      className: "bg-[#C85A2E] text-[#F8F5EF]",
    }
  }
  if (level === "cross_contamination_risk") {
    return {
      label: "Riesgo de contaminación",
      className: "bg-[#F8F5EF] text-[#1F4D35] border border-[#E8E1D6]",
    }
  }
  return {
    label: "Sin clasificación",
    className: "bg-[#CFC9BF] text-[#1F4D35]",
  }
}
