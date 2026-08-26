const LOCATION_AUTO_ENABLED_KEY = "celimap_location_auto_enabled"

/** El usuario quiere que CeliMap intente ubicación automática al abrir el mapa. No guarda coords. */
export function getLocationAutoEnabled(): boolean {
  try {
    if (typeof localStorage === "undefined") return false
    return localStorage.getItem(LOCATION_AUTO_ENABLED_KEY) === "1"
  } catch {
    return false
  }
}

export function setLocationAutoEnabled(enabled: boolean): void {
  try {
    if (typeof localStorage === "undefined") return
    if (enabled) {
      localStorage.setItem(LOCATION_AUTO_ENABLED_KEY, "1")
      return
    }
    localStorage.removeItem(LOCATION_AUTO_ENABLED_KEY)
  } catch {
    // Storage bloqueado — no romper UX.
  }
}

export function clearLocationAutoEnabled(): void {
  setLocationAutoEnabled(false)
}
