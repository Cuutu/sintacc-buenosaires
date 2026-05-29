/** Instagram: @usuario, handle o URL completa → URL clickeable */
export function normalizeInstagramUrl(value?: string): string | null {
  if (!value?.trim()) return null
  const v = value.trim()
  if (/^https?:\/\//i.test(v)) return (v.split(/[?\s]/)[0] ?? v).replace(/\/$/, "")
  const user = v
    .replace(/^@/, "")
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/\/$/, "")
  if (!user) return null
  return `https://www.instagram.com/${user}`
}

/** Texto corto para UI: @usuario (sin URL cruda) */
export function getInstagramDisplayHandle(value: string): string {
  const url = normalizeInstagramUrl(value)
  if (!url) return value.replace(/^@/, "")
  const match = url.match(/instagram\.com\/([^/?#]+)/i)
  return match?.[1] ?? value.replace(/^@/, "")
}
