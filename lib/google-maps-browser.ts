/**
 * Carga única del bootstrap de Maps JavaScript API (cliente).
 * Usa solo NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY — nunca la key server-side.
 *
 * @see https://developers.google.com/maps/documentation/javascript/load-maps-js-api
 */

type ImportLibrary = (library: string, ...args: unknown[]) => Promise<unknown>

type GoogleMapsNamespace = {
  maps: {
    importLibrary: ImportLibrary
  }
}

declare global {
  interface Window {
    google?: GoogleMapsNamespace
  }
}

let loadPromise: Promise<GoogleMapsNamespace> | null = null

export function getGoogleMapsBrowserKey(): string | null {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY?.trim()
  return key || null
}

export function isGooglePlacePhotosEnabled(): boolean {
  return process.env.NEXT_PUBLIC_GOOGLE_PLACE_PHOTOS_ENABLED === "true"
}

type BootMaps = {
  importLibrary?: ImportLibrary
  __ib__?: () => void
}

/** Bootstrap oficial (adaptado a TypeScript). Idempotente. */
function ensureGoogleMapsBootstrap(key: string): void {
  const root = window as unknown as {
    google?: { maps?: BootMaps }
  }

  if (typeof root.google?.maps?.importLibrary === "function") return

  const g: Record<string, string> = { key, v: "weekly" }
  let scriptPromise: Promise<void> | undefined
  const apiName = "The Google Maps JavaScript API"

  root.google = root.google ?? {}
  root.google.maps = root.google.maps ?? {}
  const maps: BootMaps = root.google.maps

  const pendingLibs = new Set<string>()
  const params = new URLSearchParams()

  const loadScript = () =>
    scriptPromise ||
    (scriptPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script")
      params.set("libraries", [...pendingLibs].join(","))
      for (const k of Object.keys(g)) {
        params.set(k.replace(/[A-Z]/g, (t) => "_" + t[0].toLowerCase()), g[k])
      }
      params.set("callback", "google.maps.__ib__")
      script.src = `https://maps.googleapis.com/maps/api/js?${params}`
      maps.__ib__ = () => resolve()
      script.onerror = () => reject(new Error(`${apiName} could not load.`))
      const nonceEl = document.querySelector("script[nonce]")
      if (nonceEl instanceof HTMLScriptElement && nonceEl.nonce) {
        script.nonce = nonceEl.nonce
      }
      document.head.append(script)
    }))

  if (typeof maps.importLibrary === "function") {
    console.warn(`${apiName} only loads once. Ignoring bootstrap.`)
    return
  }

  const bootstrapImportLibrary: ImportLibrary = (lib, ...rest) => {
    pendingLibs.add(lib)
    return loadScript().then(() => {
      const real = root.google?.maps?.importLibrary
      if (!real || real === bootstrapImportLibrary) {
        throw new Error("Maps JS cargó pero importLibrary no fue reemplazada")
      }
      return real(lib, ...rest)
    })
  }
  maps.importLibrary = bootstrapImportLibrary
}

export function loadGoogleMapsBrowser(): Promise<GoogleMapsNamespace> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps JS solo disponible en el navegador"))
  }

  if (loadPromise) return loadPromise

  const key = getGoogleMapsBrowserKey()
  if (!key) {
    return Promise.reject(new Error("NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY no configurada"))
  }

  ensureGoogleMapsBootstrap(key)

  const importLibrary = window.google?.maps?.importLibrary
  if (!importLibrary) {
    return Promise.reject(new Error("Google Maps bootstrap falló"))
  }

  loadPromise = importLibrary("places")
    .then(() => {
      if (!window.google?.maps?.importLibrary) {
        throw new Error("Google Maps JS cargó sin importLibrary")
      }
      return window.google
    })
    .catch((err) => {
      loadPromise = null
      throw err
    })

  return loadPromise
}
