const ATTR_KEY = "celimap_attr_v1"

export type AnalyticsAttribution = {
  source: string
  medium: string
  campaign: string
  referrerHost: string
  entryPath: string
}

const EMPTY: AnalyticsAttribution = {
  source: "direct",
  medium: "none",
  campaign: "",
  referrerHost: "",
  entryPath: "/",
}

function safeHost(raw: string): string {
  if (!raw) return ""
  try {
    const host = new URL(raw).hostname.toLowerCase().replace(/^www\./, "")
    if (!host || host.length > 80) return ""
    if (/celimap\.com\.ar$/.test(host) || host === "localhost" || host.endsWith(".vercel.app")) {
      return ""
    }
    return host
  } catch {
    return ""
  }
}

function cleanUtm(value: string | null): string {
  if (!value) return ""
  return value.trim().slice(0, 80).toLowerCase()
}

function classifySource(utmSource: string, referrerHost: string): string {
  if (utmSource) return utmSource
  if (!referrerHost) return "direct"
  if (referrerHost.includes("google.")) return "google"
  if (referrerHost.includes("instagram") || referrerHost === "l.instagram.com") return "instagram"
  if (referrerHost.includes("tiktok") || referrerHost === "vm.tiktok.com") return "tiktok"
  if (referrerHost.includes("facebook") || referrerHost === "fb.com" || referrerHost === "lm.facebook.com") {
    return "facebook"
  }
  if (referrerHost === "t.co" || referrerHost.includes("twitter") || referrerHost === "x.com") return "x"
  if (referrerHost.includes("whatsapp")) return "whatsapp"
  if (referrerHost.includes("bing.")) return "bing"
  return "referral"
}

function classifyMedium(utmMedium: string, source: string, referrerHost: string): string {
  if (utmMedium) return utmMedium
  if (source === "direct") return "none"
  if (source === "google" || source === "bing") return "organic"
  if (referrerHost) return "referral"
  return "unknown"
}

function readStored(): AnalyticsAttribution | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(ATTR_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<AnalyticsAttribution>
    if (!parsed || typeof parsed.source !== "string") return null
    return {
      source: String(parsed.source).slice(0, 80) || "direct",
      medium: String(parsed.medium || "").slice(0, 80),
      campaign: String(parsed.campaign || "").slice(0, 80),
      referrerHost: String(parsed.referrerHost || "").slice(0, 80),
      entryPath: String(parsed.entryPath || "/").slice(0, 120),
    }
  } catch {
    return null
  }
}

/** Primera visita del perfil local. Visitas siguientes reusan la atribución original. */
export function captureAnalyticsAttribution(): AnalyticsAttribution {
  if (typeof window === "undefined") return EMPTY

  const stored = readStored()
  if (stored) return stored

  const params = new URLSearchParams(window.location.search)
  const utmSource = cleanUtm(params.get("utm_source"))
  const utmMedium = cleanUtm(params.get("utm_medium"))
  const utmCampaign = cleanUtm(params.get("utm_campaign"))
  const referrerHost = safeHost(document.referrer)
  const path = window.location.pathname || "/"
  const entryPath = path.startsWith("/admin") ? "/" : path.slice(0, 120)
  const source = classifySource(utmSource, referrerHost)
  const attr: AnalyticsAttribution = {
    source,
    medium: classifyMedium(utmMedium, source, referrerHost),
    campaign: utmCampaign,
    referrerHost,
    entryPath,
  }

  try {
    window.localStorage.setItem(ATTR_KEY, JSON.stringify(attr))
  } catch {
    /* ignore */
  }
  return attr
}

export function getAnalyticsAttribution(): AnalyticsAttribution {
  return readStored() ?? captureAnalyticsAttribution()
}

export { classifySource as classifyTrafficSource }
