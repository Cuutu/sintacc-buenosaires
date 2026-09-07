export const ACTIVITY_ACTIVE_MS = 5 * 60 * 1000

export function formatRelativeActivity(fromMs: number, nowMs = Date.now()): string {
  const delta = Math.max(0, nowMs - fromMs)
  const sec = Math.floor(delta / 1000)
  if (sec < 10) return "hace 0 segundos"
  if (sec < 60) return `hace ${sec} s`
  const min = Math.floor(sec / 60)
  if (min < 60) return `hace ${min} min`
  const hours = Math.floor(min / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  return `hace ${days} d`
}

export function platformActivityLabel(
  platform: string,
  device: string
): string {
  if (platform === "android_native") return "Android"
  if (platform === "ios_native") return "iOS"
  if (platform === "pwa") return "PWA"
  if (device === "mobile") return "Web / Móvil"
  if (device === "tablet") return "Web / Tablet"
  return "Web / Escritorio"
}
