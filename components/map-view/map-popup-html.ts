import type { IPlace } from "@/models/Place"
import {
  formatShortPlaceAddress,
  getPlaceDetailPath,
  getPlaceDirectionsUrl,
  getPlaceRatingLine,
  getPlaceSafety,
  getPlaceTypeKey,
  getPlaceTypeLabel,
  PLACE_CARD,
} from "./place-selected-card-model"

export const TYPE_MARKERS: Record<string, { emoji: string; bg: string; label: string }> = {
  restaurant: { emoji: "🍽️", bg: "#ea580c", label: "Restaurante" },
  cafe: { emoji: "☕", bg: "#78350f", label: "Café" },
  bakery: { emoji: "🥐", bg: "#ca8a04", label: "Panadería" },
  store: { emoji: "🛒", bg: "#16a34a", label: "Tienda" },
  icecream: { emoji: "🍦", bg: "#ec4899", label: "Heladería" },
  bar: { emoji: "🍺", bg: "#7c3aed", label: "Bar" },
  other: { emoji: "📍", bg: "#3b82f6", label: "Lugar" },
}

const TYPE_ICON_PATHS: Record<string, string> = {
  restaurant:
    '<path d="M3 2v7c0 1.7 1.3 3 3 3s3-1.3 3-3V2"/><path d="M6 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Z"/>',
  cafe: '<path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8h1a4 4 0 1 1 0 8h-1"/><path d="M5 8h11v7a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5Z"/>',
  bakery:
    '<path d="M12 20a8 8 0 0 0 8-8c0-2.6-1.3-5-3.4-6.4"/><path d="M12 20a8 8 0 0 1-8-8c0-2.6 1.3-5 3.4-6.4"/><path d="M12 20c2.2 0 4-3.6 4-8s-1.8-8-4-8-4 3.6-4 8 1.8 8 4 8Z"/><path d="M4.3 10h15.4"/>',
  store:
    '<path d="m15 11-1 9"/><path d="m19 11-4-7"/><path d="M2 11h20"/><path d="m3.5 11 1.6 7.4A2 2 0 0 0 7.1 20h9.8a2 2 0 0 0 2-1.6l1.6-7.4"/><path d="M5 11 9 4"/>',
  icecream: '<path d="M7 11a5 5 0 0 1 10 0"/><path d="M8 11h8l-4 10Z"/><path d="M12 3v2"/>',
  bar: '<path d="M8 22h8"/><path d="M12 16v6"/><path d="M7 2h10l-1 9a4 4 0 0 1-8 0Z"/><path d="M7 8h10"/>',
  other:
    '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function svgIcon(path: string, size = 16): string {
  return `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.15" stroke-linecap="round" stroke-linejoin="round" style="width:${size}px;height:${size}px;display:block;flex:0 0 auto">${path}</svg>`
}

export function isCompactMapPopup(): boolean {
  if (typeof window === "undefined") return false
  return window.matchMedia("(max-width: 768px)").matches
}

export function buildPlacePopupHtml(place: IPlace): string {
  const typeKey = getPlaceTypeKey(place)
  const safety = getPlaceSafety(place)
  const typeLabel = escapeHtml(getPlaceTypeLabel(place))
  const name = escapeHtml(place.name)
  const neighborhood = escapeHtml(place.neighborhood || "")
  const meta = [typeLabel, neighborhood].filter(Boolean).join(" • ")
  const address = escapeHtml(formatShortPlaceAddress(place))
  const rating = getPlaceRatingLine(place)
  const directionsUrl = escapeHtml(getPlaceDirectionsUrl(place))
  const detailPath = escapeHtml(getPlaceDetailPath(place))
  const typePath = TYPE_ICON_PATHS[typeKey] ?? TYPE_ICON_PATHS.other

  const ratingHtml = rating
    ? `<p style="margin:12px 0 0;display:flex;flex-wrap:wrap;align-items:center;gap:8px;color:${PLACE_CARD.muted};font-size:13.5px;line-height:1">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="${PLACE_CARD.terracotta}" style="width:16px;height:16px;display:block"><path d="m12 2.8 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3L12 17.2 6.4 20.2l1.1-6.3-4.6-4.5 6.3-.9L12 2.8Z"/></svg>
        <span style="font-weight:800;color:${PLACE_CARD.olive}">${escapeHtml(rating.score)}</span>
        <span style="font-weight:600">${escapeHtml(rating.source)}</span>
        ${rating.countLabel ? `<span>${escapeHtml(rating.countLabel)}</span>` : ""}
      </p>`
    : ""

  return `
    <article style="width:min(400px,calc(100vw - 24px));overflow:hidden;border-radius:24px;background:${PLACE_CARD.bg};color:${PLACE_CARD.olive};border:1px solid ${PLACE_CARD.border};box-shadow:0 10px 28px rgba(31,77,53,.08);font-family:Nunito,ui-sans-serif,system-ui,sans-serif;padding:12px 20px 20px">
      <div aria-hidden="true" style="width:40px;height:4px;border-radius:999px;background:${PLACE_CARD.border};margin:0 auto 14px"></div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
        <span style="display:inline-flex;align-items:center;gap:6px;max-width:75%;border-radius:999px;border:1px solid ${safety.badgeBorder};background:${safety.badgeBg};color:${safety.badgeText};padding:6px 10px;font-size:12px;font-weight:800;line-height:1;white-space:nowrap">
          <span style="width:6px;height:6px;border-radius:999px;background:${safety.accent};flex:0 0 auto"></span>
          ${escapeHtml(safety.label)}
        </span>
        <span aria-hidden="true" style="display:flex;width:36px;height:36px;align-items:center;justify-content:center;border-radius:999px;background:rgba(31,77,53,.08);color:${PLACE_CARD.olive}">
          ${svgIcon(typePath, 16)}
        </span>
      </div>
      <h2 title="${name}" style="margin:14px 0 0;font-size:22px;font-weight:800;line-height:1.15;letter-spacing:-0.03em;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${name}</h2>
      ${meta ? `<p style="margin:6px 0 0;color:${PLACE_CARD.muted};font-size:13.5px;font-weight:500;line-height:1.35">${meta}</p>` : ""}
      ${
        address
          ? `<p style="margin:12px 0 0;display:flex;align-items:flex-start;gap:8px;color:${PLACE_CARD.muted};font-size:13.5px;line-height:1.35">
              <span style="color:${PLACE_CARD.olive};margin-top:1px">${svgIcon(
                '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
                16
              )}</span>
              <span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${address}</span>
            </p>`
          : ""
      }
      ${ratingHtml}
      <div style="margin-top:20px;display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <a href="${detailPath}" style="display:flex;align-items:center;justify-content:center;gap:6px;min-height:48px;border-radius:16px;background:${PLACE_CARD.terracotta};color:#fff;text-decoration:none;font-size:14px;font-weight:800" onclick="event.stopPropagation()">
          Ver lugar
          ${svgIcon('<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>', 16)}
        </a>
        <a href="${directionsUrl}" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;justify-content:center;gap:6px;min-height:48px;border-radius:16px;background:transparent;border:1px solid ${PLACE_CARD.olive};color:${PLACE_CARD.olive};text-decoration:none;font-size:14px;font-weight:800" onclick="event.stopPropagation()">
          ${svgIcon('<polygon points="3 11 22 2 13 21 11 13 3 11"/>', 16)}
          Cómo llegar
        </a>
      </div>
    </article>
  `
}
