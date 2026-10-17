/**
 * Links https de celimap.com.ar que abren la app (Universal Links en iOS, App Links en Android).
 *
 * El sistema abre la app, pero no mueve el WebView: hay que llevarlo a la página del link.
 * Sólo /local… (ver lib/apple-app-site-association.ts y el AndroidManifest): el QR de la
 * tarjeta de sellos abre /local/sellar/<serial> con la sesión del local.
 */

const APP_LINK_HOSTS = new Set(["www.celimap.com.ar", "celimap.com.ar"])

export function isAppLinkPath(pathname: string): boolean {
  return pathname === "/local" || pathname.startsWith("/local/")
}

/** La ruta interna (path + query + hash) de un link que abre la app, o null si no es uno. */
export function appLinkPath(url: unknown): string | null {
  if (typeof url !== "string" || url.length === 0 || url.length > 2048) return null
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (parsed.protocol !== "https:") return null
  if (!APP_LINK_HOSTS.has(parsed.hostname.toLowerCase())) return null
  if (parsed.username || parsed.password || parsed.port) return null
  if (!isAppLinkPath(parsed.pathname)) return null
  return `${parsed.pathname}${parsed.search}${parsed.hash}`
}

const STORAGE_PREFIX = "celimap:applink:v1:"
const memoryHandled = new Set<string>()

function wasHandled(url: string): boolean {
  if (memoryHandled.has(url)) return true
  try {
    return typeof sessionStorage !== "undefined" && sessionStorage.getItem(STORAGE_PREFIX + url) === "1"
  } catch {
    return false
  }
}

function markHandled(url: string): void {
  memoryHandled.add(url)
  try {
    if (typeof sessionStorage !== "undefined") sessionStorage.setItem(STORAGE_PREFIX + url, "1")
  } catch {
    // Sin sessionStorage: alcanza con la memoria de esta página.
  }
}

/** Para tests. */
export function __resetAppLinksForTests(): void {
  memoryHandled.clear()
  try {
    if (typeof sessionStorage === "undefined") return
    const keys: string[] = []
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i)
      if (key?.startsWith(STORAGE_PREFIX)) keys.push(key)
    }
    keys.forEach((key) => sessionStorage.removeItem(key))
  } catch {
    /* ignore */
  }
}

/**
 * Lleva el WebView a la página del link.
 * - "open" (appUrlOpen): cada apertura es nueva, aunque sea el mismo link (escanear la misma tarjeta dos veces).
 * - "launch" (getLaunchUrl): la app devuelve el mismo link mientras siga abierta, así que se usa una sola vez;
 *   si no, cada vez que carga una página volvería a la del link.
 */
export function createAppLinkHandler(deps: {
  assign: (href: string) => void
  currentHref: () => string
}) {
  // Al abrir la app con el link pueden llegar los dos avisos ("open" y "launch") en la misma página.
  let navigatingTo: string | null = null
  return function handleAppLink(url: unknown, source: "open" | "launch"): boolean {
    const path = appLinkPath(url)
    if (!path || typeof url !== "string") return false
    if (source === "launch" && wasHandled(url)) return false
    markHandled(url)
    if (navigatingTo === path) return true
    let current = ""
    try {
      const here = new URL(deps.currentHref())
      current = `${here.pathname}${here.search}${here.hash}`
    } catch {
      // sin URL actual: navegar igual
    }
    if (source === "launch" && current === path) return true
    navigatingTo = path
    deps.assign(path)
    return true
  }
}
