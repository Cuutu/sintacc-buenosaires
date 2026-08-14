import type { CapacitorConfig } from "@capacitor/cli"

/**
 * server.url se resuelve en sync-time (máquina del developer / CI), no en runtime WebView.
 *
 * Producción (default):
 *   npx cap sync
 *   → siempre https://www.celimap.com.ar
 *
 * Preview / staging (explícito, nunca accidental):
 *   CAPACITOR_SERVER_MODE=preview CAPACITOR_SERVER_URL=https://<host> npx cap sync
 *
 * Guardas:
 * - URL sola sin MODE=preview → throw (bloquea override accidental)
 * - MODE=preview sin URL → throw
 * - Release CI: no definir CAPACITOR_SERVER_* → prod garantizado
 */

const PROD_SERVER_URL = "https://www.celimap.com.ar"

function resolveServer(): { url: string; cleartext: boolean; isPreview: boolean } {
  const mode = process.env.CAPACITOR_SERVER_MODE?.trim()
  const previewUrl = process.env.CAPACITOR_SERVER_URL?.trim()

  // CI Release: CM_BRANCH / forzar prod — prohibido tener vars preview
  const ciRelease =
    process.env.CAPACITOR_RELEASE_LOCK === "1" ||
    process.env.CM_CAPACITOR_RELEASE === "1"

  if (ciRelease && (mode || previewUrl)) {
    throw new Error(
      "[capacitor] Release lock activo: CAPACITOR_SERVER_MODE/URL no permitidos. " +
        "Usá workflow preview separado."
    )
  }

  if (previewUrl && mode !== "preview") {
    throw new Error(
      "[capacitor] CAPACITOR_SERVER_URL definido sin CAPACITOR_SERVER_MODE=preview. " +
        "Abortando para no apuntar Release a staging por error."
    )
  }

  if (mode === "preview") {
    if (!previewUrl) {
      throw new Error(
        "[capacitor] CAPACITOR_SERVER_MODE=preview requiere CAPACITOR_SERVER_URL."
      )
    }
    if (previewUrl === PROD_SERVER_URL || /celimap\.com\.ar$/i.test(new URL(previewUrl).hostname)) {
      throw new Error(
        "[capacitor] preview no puede usar URL de producción. Quitá MODE=preview."
      )
    }
    const cleartext = previewUrl.startsWith("http://")
    return { url: previewUrl, cleartext, isPreview: true }
  }

  return { url: PROD_SERVER_URL, cleartext: false, isPreview: false }
}

const server = resolveServer()

const config: CapacitorConfig = {
  appId: "com.celimap.app",
  // Nombre visible distinto en Preview (mismo bundle ID / signing)
  appName: server.isPreview ? "CeliMap Preview" : "Celimap",
  webDir: "www",
  server: {
    url: server.url,
    cleartext: server.cleartext,
  },
  android: {
    appendUserAgent: server.isPreview ? " CelimapNative/1 CelimapPreview/1" : " CelimapNative/1",
    backgroundColor: "#F7F3EB",
    allowMixedContent: false,
  },
  ios: {
    appendUserAgent: server.isPreview ? " CelimapNative/1 CelimapPreview/1" : " CelimapNative/1",
    backgroundColor: "#F7F3EB",
  },
  plugins: {
    SplashScreen: {
      // Splash nativo lo controla MainActivity hasta pageReady
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: "#F7F3EB",
      showSpinner: false,
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#F7F3EB",
      // Política B: WebView edge-to-edge; insets vía CSS env(safe-area-*)
      overlaysWebView: true,
    },
    // Capgo SocialLogin: Google + Apple nativos en iOS (Facebook/Twitter off).
    SocialLogin: {
      providers: {
        google: true,
        apple: true,
        facebook: false,
        twitter: false,
      },
    },
  },
}

export default config
