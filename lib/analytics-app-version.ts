const VERSION_KEY = "celimap_app_version"
const VERSION_RE = /^[A-Za-z0-9._+\-() ]{1,40}$/

let cached = ""

export function sanitizeAppVersion(value: unknown): string {
  if (typeof value !== "string") return ""
  const clipped = value.trim().slice(0, 40)
  return VERSION_RE.test(clipped) ? clipped : ""
}

export function getAnalyticsAppVersion(): string {
  if (cached) return cached
  if (typeof window === "undefined") return ""
  try {
    const stored = window.localStorage.getItem(VERSION_KEY)
    const clean = sanitizeAppVersion(stored)
    if (clean) cached = clean
  } catch {
    /* ignore */
  }
  return cached
}

export function setAnalyticsAppVersion(value: string): void {
  const clean = sanitizeAppVersion(value)
  if (!clean) return
  cached = clean
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(VERSION_KEY, clean)
  } catch {
    /* ignore */
  }
}

/** Lee versión nativa (Capacitor) una vez. No bloquea el mapa. */
export function warmAnalyticsAppVersion(): void {
  if (typeof window === "undefined") return
  void import("@/lib/native-app")
    .then(({ isNativeApp }) => {
      if (!isNativeApp()) return
      return import("@capacitor/app").then(({ App }) => App.getInfo())
    })
    .then((info) => {
      if (!info) return
      const version = info.version || ""
      const build = info.build && info.build !== info.version ? info.build : ""
      setAnalyticsAppVersion(build ? `${version} (${build})` : version)
    })
    .catch(() => undefined)
}
